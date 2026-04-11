import asyncio
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import json
import logging
import ssl
import httpx
import aio_pika
import uuid
import redis.asyncio as redis
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import random
import hmac
import hashlib
import base64

# Import notification service (sys.path already includes ../api)
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
from services.notification_service import notify_campaign_completed, notify_bounce_alert

# SSL context for RabbitMQ (amqps://) connections
# Production: full cert verification (default). Dev: set AMQP_SKIP_TLS_VERIFY=true to bypass.
_SKIP_TLS = os.getenv("AMQP_SKIP_TLS_VERIFY", "false").lower() == "true"
ssl_context = ssl.create_default_context()
if _SKIP_TLS:
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    import logging as _log; _log.getLogger("email_engine").warning(
        "⚠️  AMQP_SKIP_TLS_VERIFY=true — TLS cert verification DISABLED (dev-only mode)"
    )

# Load environment variables from repo root
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ROOT_ENV, override=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Worker: %(message)s")
logger = logging.getLogger(__name__)

# --- Configuration ---
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
PREFETCH_COUNT = int(os.getenv("WORKER_PREFETCH_COUNT", "10"))
MAX_RETRIES = int(os.getenv("WORKER_MAX_RETRIES", "3"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
UNSUB_SECRET = os.getenv("UNSUBSCRIBE_SECRET", "dev-unsub-secret-change-in-production")
FRONTEND_BASE = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
TRACKING_SECRET = os.getenv("TRACKING_SECRET", "dev-tracking-secret")

def _get_api_base() -> str:
    """Reload API_URL from .env on every call so tunnel URL changes are picked up."""
    load_dotenv(override=True)
    return os.getenv("API_URL", "http://localhost:8000")

def _get_backend_url() -> str:
    load_dotenv(override=True)
    return os.getenv("BACKEND_URL", "http://localhost:8000")

def _make_unsub_token(contact_id: str, campaign_id: str) -> str:
    payload = f"{contact_id}:{campaign_id}"
    sig = hmac.new(UNSUB_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()

def _inject_email_footer(body_html: str, contact_id: str, campaign_id: str, tenant_footer_text=None) -> str:
    """Append mandatory unsubscribe link + physical address footer to email HTML."""
    token = _make_unsub_token(contact_id, campaign_id)
    unsub_url = f"{_get_backend_url()}/unsubscribe?token={token}"
    address_text = tenant_footer_text or "Email Engine Inc. &bull; 123 Main Street &bull; City, State 00000 &bull; Country"
    
    footer = f"""
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-family:sans-serif;font-size:12px;color:#9ca3af;">
  <p style="margin:0 0 6px;">You received this email because you subscribed to our mailing list.</p>
  <p style="margin:0 0 6px;">
    <a href="{unsub_url}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
  </p>
  <p style="margin:0;">{address_text}</p>
</div>"""
    # Insert before </body> if present, else append
    if "</body>" in body_html.lower():
        return body_html.replace("</body>", footer + "</body>", 1)
    return body_html + footer

def _inject_tracking_pixel(body_html: str, dispatch_id: str) -> str:
    """Inject 1×1 tracking pixel to detect email opens."""
    sig = hmac.new(TRACKING_SECRET.encode(), dispatch_id.encode(), hashlib.sha256).hexdigest()
    pixel = f'<img src="{_get_api_base()}/track/open/{dispatch_id}?s={sig}" width="1" height="1" style="display:none;" alt="" />'
    # Insert just before </body> if present, else append
    if "</body>" in body_html.lower():
        return body_html.replace("</body>", pixel + "</body>", 1)
    return body_html + pixel

import re as _re

def _wrap_links(body_html: str, dispatch_id: str) -> str:
    """Rewrite all <a href="..."> links through click tracker.
       (DISABLED: To save Edge Function invocations & costs, we only track opens/bounces/unsubscribes)"""
    return body_html

def _wrap_links_text(body_text: str, dispatch_id: str) -> str:
    """Rewrite plain-text URLs through click tracker.
       (DISABLED: To save Edge Function invocations & costs, we only track opens/bounces/unsubscribes)"""
    return body_text

def _inject_honeypot(body_html: str, dispatch_id: str) -> str:
    """Add a hidden link to flag aggressive scanners as bots."""
    hp_dest = "https://example.com/ignore"
    encoded = base64.urlsafe_b64encode(hp_dest.encode()).decode().rstrip("=")
    sig = hmac.new(TRACKING_SECRET.encode(), f"{dispatch_id}:{encoded}".encode(), hashlib.sha256).hexdigest()
    link = f'<a href="{_get_api_base()}/track/click?d={dispatch_id}&u={encoded}&s={sig}&hp=1" style="display:none;">.</a>'
    if "</body>" in body_html.lower():
        return body_html.replace("</body>", link + "</body>", 1)
    return body_html + link

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment")

# Initialize Clients
redis_client = redis.from_url(REDIS_URL, decode_responses=True)
db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Force HTTP/1.1 on DB client to avoid stale HTTP/2 ConnectionTerminated errors
_http1 = httpx.Client(transport=httpx.HTTPTransport(http2=False), timeout=30.0)
db.postgrest.session = _http1

# RabbitMQ settings
EXCHANGE_NAME = "campaign_exchange"
QUEUE_NAME = "bulk_email_queue"
# Parking queue for Paused campaigns
HOLDING_EXCHANGE = "holding_exchange"
PARKING_QUEUE = "paused_parking_queue"
TTL_MS = 60000  # 60 seconds sleep

async def setup_queues(channel: aio_pika.robust_channel.RobustChannel) -> tuple:
    """Declare main and parking queues to support the TTL routing pattern."""
    # Main Exchange & Queue
    main_exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.DIRECT, durable=True)
    main_queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await main_queue.bind(main_exchange, routing_key="email.send")
    
    # Holding Exchange & Parking Queue (for Paused campaigns)
    holding_exchange = await channel.declare_exchange(HOLDING_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True)
    parking_queue = await channel.declare_queue(
        PARKING_QUEUE,
        durable=True,
        arguments={
            "x-message-ttl": TTL_MS,  # Sleep for 60 seconds
            "x-dead-letter-exchange": EXCHANGE_NAME,  # Route back to main exchange
            "x-dead-letter-routing-key": "email.send" # Using same routing key
        }
    )
    await parking_queue.bind(holding_exchange, routing_key="campaign.paused")
    
    return main_queue, holding_exchange

async def process_message(message: aio_pika.abc.AbstractIncomingMessage, holding_exchange: aio_pika.robust_exchange.RobustExchange):
    async with message.process(ignore_processed=True):
        try:
            payload = json.loads(message.body.decode())
            campaign_id = payload.get("campaign_id")
            dispatch_id = payload.get("dispatch_id")
            recipient_email = payload.get("recipient_email")
            
            # 1. Immediate State Check via Redis
            state_key = f"campaign:{campaign_id}:status"
            state = await redis_client.get(state_key)
            
            if state == "CANCELLED":
                logger.info(f"[{dispatch_id}] Campaign CANCELLED. Silently discarding message for {recipient_email}.")
                await message.ack()
                return
                
            if state == "PAUSED":
                logger.info(f"[{dispatch_id}] Campaign PAUSED. Routing to parking queue.")
                # Publish to holding exchange which routes to parking queue with TTL
                new_msg = aio_pika.Message(
                    body=message.body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                )
                await holding_exchange.publish(new_msg, routing_key="campaign.paused")
                await message.ack() # Remove from active main queue
                return

            # 1.5 Automated Deliverability Penalties (Bounce Rate Circuit Breaker)
            # Before claiming the row, check if the tenant's rolling bounce rate is > 5%
            tenant_key_opt = await redis_client.get(f"campaign:{campaign_id}:tenant_id")
            if tenant_key_opt:
                # Get total hands for tenant in last 24h
                # In a real app we'd query Supabase: select count(*) where status = sent vs bounced and updated_at > now() - 24h
                # For this implementation, we will mock a Redis cache check for bounce rates
                bounce_rate_opt = await redis_client.get(f"tenant:{tenant_key_opt}:metrics:rolling_bounce_rate")
                if bounce_rate_opt:
                    try:
                        bounce_rate = float(bounce_rate_opt)
                        if bounce_rate > 0.05:
                            logger.error(f"[{campaign_id}] 🛑 CIRCUIT BREAKER: Rolling bounce rate is {bounce_rate*100:.1f}%. Auto-pausing campaign to protect infrastructure.")
                            # Update Redis and Postgres state
                            await redis_client.set(state_key, "PAUSED")
                            db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
                            
                            # ── Phase 7: Notify tenant of bounce rate alert ──
                            try:
                                camp_info = db.table("campaigns").select("name, tenant_id").eq("id", campaign_id).execute()
                                if camp_info.data:
                                    t_id = camp_info.data[0]["tenant_id"]
                                    c_name = camp_info.data[0].get("name", "Unnamed")
                                    t_info = db.table("tenants").select("email").eq("id", t_id).execute()
                                    if t_info.data and t_info.data[0].get("email"):
                                        await notify_bounce_alert(t_info.data[0]["email"], bounce_rate, c_name, campaign_id)
                            except Exception as ne:
                                logger.warning(f"[{campaign_id}] Bounce notification failed: {ne}")
                            
                            # Route current dispatch message to parking queue
                            new_msg = aio_pika.Message(body=message.body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT)
                            await holding_exchange.publish(new_msg, routing_key="campaign.paused")
                            await message.ack()
                            return
                    except ValueError:
                        pass

            # 2. Database Intent Claim
            # In Supabase REST API, we can't do true row-level locks easily without RPC.
            # We will do an atomic UPDATE WHERE status = 'PENDING'
            worker_uuid = str(uuid.uuid4())
            update_res = db.table("campaign_dispatch")\
                .update({"status": "PROCESSING", "updated_at": "now()", "locked_by": worker_uuid})\
                .eq("id", dispatch_id)\
                .eq("status", "PENDING")\
                .execute()
                
            if not update_res.data:
                logger.warning(f"[{dispatch_id}] Skipping: Could not claim row (already processing or processed).")
                await message.ack()
                return

            logger.info(f"[{dispatch_id}] Claimed row. Sending to {recipient_email}...")

            # 3. Inject mandatory footer + tracking
            recipient_id = payload.get("recipient_id", "")
            body_html = payload.get("body_html", "")
            
            if body_html and recipient_id:
                # Fetch tenant details dynamically to customize the footer
                tenant_footer_text = None
                try:
                    camp_info = db.table("campaigns").select("tenant_id").eq("id", campaign_id).execute()
                    if camp_info.data:
                        t_id = camp_info.data[0]["tenant_id"]
                        t_info = db.table("tenants").select("company_name, business_address, business_city, business_state, business_zip, business_country").eq("id", t_id).execute()
                        if t_info.data:
                            td = t_info.data[0]
                            parts: list[str] = []
                            if td.get("company_name"): parts.append(td["company_name"])
                            if td.get("business_address"): parts.append(td["business_address"])
                            
                            city_data = filter(bool, [td.get("business_city"), td.get("business_state"), td.get("business_zip")])
                            city_str = " ".join(city_data)
                            if city_str: parts.append(city_str)
                            
                            if td.get("business_country"): parts.append(td["business_country"])
                            
                            if parts:
                                tenant_footer_text = " &bull; ".join(parts)
                except Exception as e:
                    logger.warning(f"[{dispatch_id}] Failed to load dynamic footer formatting: {e}")
            
                body_html = _inject_email_footer(body_html, recipient_id, campaign_id, tenant_footer_text=tenant_footer_text)
                body_html = _inject_tracking_pixel(body_html, dispatch_id)
                body_html = _wrap_links(body_html, dispatch_id)
                body_html = _inject_honeypot(body_html, dispatch_id)
                logger.info(f"[{dispatch_id}] Footer + tracking injected for {recipient_email}")

            # 4. Real SMTP Send via AWS SES (or fallback to simulation)
            smtp_host     = os.getenv("SMTP_HOST")
            smtp_port     = int(os.getenv("SMTP_PORT", 587))
            smtp_user     = os.getenv("SMTP_USERNAME")
            smtp_pass     = os.getenv("SMTP_PASSWORD")
            smtp_from     = payload.get("from_email") or os.getenv("SMTP_FROM_EMAIL", "noreply@emailengine.app")
            smtp_from_name = payload.get("from_name") or os.getenv("SMTP_FROM_NAME", "Email Engine")
            subject       = payload.get("subject", "(No Subject)")

            message_id = None  # Will be set after send

            if smtp_host and smtp_user and smtp_pass:
                # ── Real send ──────────────────────────────────────────────
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"]    = f"{smtp_from_name} <{smtp_from}>"
                msg["To"]      = recipient_email
                msg["Message-ID"] = f"<{dispatch_id}@emailengine.app>"

                # Plain text fallback (strip HTML tags simply)
                import re as _re2
                plain = _re2.sub(r'<[^>]+>', '', body_html or subject)
                # Rewrite plain-text URLs so clicks are tracked even in text-only emails
                plain = _wrap_links_text(plain, dispatch_id)
                msg.attach(MIMEText(plain, "plain"))
                msg.attach(MIMEText(body_html or f"<p>{subject}</p>", "html"))

                await aiosmtplib.send(
                    msg,
                    hostname=smtp_host,
                    port=smtp_port,
                    username=smtp_user,
                    password=smtp_pass,
                    start_tls=True,
                )
                message_id = msg["Message-ID"]
                logger.info(f"[{dispatch_id}] SMTP sent → {recipient_email} via {smtp_host}")
            else:
                # ── Dev simulation (no SMTP creds in .env) ─────────────────
                logger.warning(f"[{dispatch_id}] No SMTP creds — simulating send to {recipient_email}")
                await asyncio.sleep(random.uniform(0.1, 0.3))
                message_id = f"sim-{random.randint(100000, 999999)}"

            # 5. Mark DISPATCHED
            # Note: stored as external_msg_id per our migration
            db.table("campaign_dispatch")\
                .update({
                    "status": "DISPATCHED",
                    "ses_message_id": message_id,
                    "external_msg_id": message_id,
                    "sent_at": "now()",
                    "updated_at": "now()"
                })\
                .eq("id", dispatch_id)\
                .execute()

            logger.info(f"[{dispatch_id}] Status → DISPATCHED (msg_id={message_id})")

            # 6. Auto-complete campaign if all dispatches are done
            try:
                remaining = db.table("campaign_dispatch")\
                    .select("id", count="exact")\
                    .eq("campaign_id", campaign_id)\
                    .in_("status", ["PENDING", "PROCESSING"])\
                    .execute()
                if (remaining.count or 0) == 0:
                    db.table("campaigns")\
                        .update({"status": "sent"})\
                        .eq("id", campaign_id)\
                        .execute()
                    logger.info(f"[{campaign_id}] All dispatches complete → Campaign marked as SENT")
                    
                    # ── Phase 7: Notify tenant of campaign completion ──
                    try:
                        camp_info = db.table("campaigns").select("name, tenant_id").eq("id", campaign_id).execute()
                        if camp_info.data:
                            t_id = camp_info.data[0]["tenant_id"]
                            c_name = camp_info.data[0].get("name", "Unnamed")
                            # Get dispatch stats
                            sent_count = db.table("campaign_dispatch").select("id", count="exact").eq("campaign_id", campaign_id).eq("status", "DISPATCHED").execute()
                            fail_count = db.table("campaign_dispatch").select("id", count="exact").eq("campaign_id", campaign_id).eq("status", "FAILED").execute()
                            total_sent = sent_count.count or 0
                            total_failed = fail_count.count or 0
                            # Look up tenant email
                            t_info = db.table("tenants").select("email").eq("id", t_id).execute()
                            if t_info.data and t_info.data[0].get("email"):
                                await notify_campaign_completed(t_info.data[0]["email"], c_name, total_sent, total_failed, campaign_id)
                    except Exception as ne:
                        logger.warning(f"[{campaign_id}] Completion notification failed: {ne}")
            except Exception as e:
                logger.warning(f"[{campaign_id}] Auto-complete check failed: {e}")
            await message.ack()

        except Exception as e:
            attempts = int(message.headers.get("attempts", 0) if message.headers else 0)
            logger.error(f"Worker Error processing message (attempt {attempts + 1}/{MAX_RETRIES}): {e}")

            # Retry with capped attempts
            if attempts + 1 < MAX_RETRIES:
                try:
                    # Small exponential backoff to avoid hammering SMTP/DB on transient errors
                    delay = min(2 ** attempts, 30)
                    if delay > 0:
                        await asyncio.sleep(delay)
                    new_msg = aio_pika.Message(
                        body=message.body,
                        headers={"attempts": attempts + 1},
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    )
                    await message.channel.default_exchange.publish(new_msg, routing_key=QUEUE_NAME)
                    await message.ack()
                    return
                except Exception as requeue_err:
                    logger.error(f"Retry publish failed: {requeue_err}")

            # Final failure path
            try:
                decoded = json.loads(message.body.decode())
                dispatch_id = decoded.get("dispatch_id")
                recipient_id = decoded.get("recipient_id")
                if dispatch_id:
                    db.table("campaign_dispatch")\
                        .update({"status": "FAILED", "error_log": str(e), "updated_at": "now()"})\
                        .eq("id", dispatch_id)\
                        .execute()
                if recipient_id:
                    db.table("contacts")\
                        .update({"status": "bounced"})\
                        .eq("id", recipient_id)\
                        .execute()
                    logger.warning(f"[{dispatch_id}] Contact {recipient_id} marked as bounced")
            except Exception as inner_e:
                logger.error(f"Failed to mark failure in DB: {inner_e}")
            if not message.processed:
                await message.nack(requeue=False)

async def main():
    logger.info("Starting State-Aware Email Worker...")
    connection = await aio_pika.connect_robust(RABBITMQ_URL, ssl=ssl_context)
    
    async with connection:
        channel = await connection.channel()
        # Prefetch is configurable so we can balance throughput vs. pause/cancel latency
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)
        
        main_queue, holding_exchange = await setup_queues(channel)
        logger.info(f"Consuming from {QUEUE_NAME}. Waiting for messages...")
        
        async with main_queue.iterator() as queue_iter:
            async for message in queue_iter:
                await process_message(message, holding_exchange)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker gracefully shutting down.")
