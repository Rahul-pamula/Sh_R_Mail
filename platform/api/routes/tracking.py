"""
Phase 6 — Email Open & Click Tracking

Endpoints:
  GET /track/open/{dispatch_id}   → 1x1 transparent pixel, records open event
  GET /track/click                → records click, redirects to destination URL
"""
import base64
import hashlib
import hmac
import os
from fastapi import APIRouter, Request, Query, HTTPException
from fastapi.responses import Response, RedirectResponse
from utils.supabase_client import db
import logging

# Rate limiting
from utils.rate_limiter import limiter

logger = logging.getLogger("email_engine.tracking")
router = APIRouter(prefix="/track", tags=["Tracking"])

# 1×1 transparent GIF (35 bytes)
PIXEL_GIF = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

# ── Bot Detection ──────────────────────────────────────────────────────────────
BOT_UA_FRAGMENTS = [
    # Search engine bots
    "googlebot", "bingbot", "yahoobot", "slurp", "duckduckbot", "baiduspider",
    "yandexbot", "sogou", "exabot", "semrushbot",
    "ahrefs", "mj12bot", "dotbot", "rogerbot", "screaming frog",
    # Email client image proxies (these pre-load pixels, causing false opens)
    "googleimageproxy",   # Gmail Image Proxy (via ggpht.com)
    "ggpht.com",          # Gmail Image Proxy alternate identifier
    "yahoo link preview", # Yahoo Mail proxy
    "yahooproxy",         # Yahoo proxy
    "applebot",           # Apple bot
# Generic automation / dev tools
    "preview", "scanner", "curl", "python-requests", "go-http-client",
    "postmanruntime", "axios", "okhttp", "facebookexternalhit",
]

# IP prefixes used by major email clients for image proxying
PROXY_IP_PREFIXES = [
    # Google Image Proxy (Gmail)
    "66.249.84.", "66.249.85.", "66.249.89.", "66.249.91.",
    "72.14.199.", "74.125.", "104.28.", "108.177.",
    # Yahoo
    "216.39.62.", "66.218.66.",
]

TRACKING_SECRET = os.getenv("TRACKING_SECRET", "dev-tracking-secret")

def _is_bot(user_agent: str, ip: str = "") -> bool:
    ua = (user_agent or "").lower()
    if any(frag in ua for frag in BOT_UA_FRAGMENTS):
        return True
        
    if ip and any(ip.startswith(prefix) for prefix in PROXY_IP_PREFIXES):
        return True
        
    return False



def _record_event(
    dispatch_id: str,
    event_type: str,
    url: str | None,
    ip: str,
    user_agent: str,
    force_bot: bool = False,
) -> None:
    """Fire-and-forget: record tracking event in email_events table."""
    try:
        # Get dispatch info
        disp = db.client.table("campaign_dispatch")\
            .select("campaign_id, subscriber_id")\
            .eq("id", dispatch_id)\
            .execute()

        if not disp.data:
            logger.warning(f"[TRACK] dispatch_id {dispatch_id} not found")
            return

        d = disp.data[0]
        campaign_id = d["campaign_id"]
        contact_id  = d["subscriber_id"]

        # Get tenant_id from campaigns table separately
        camp = db.client.table("campaigns")\
            .select("tenant_id")\
            .eq("id", campaign_id)\
            .execute()

        if not camp.data:
            logger.warning(f"[TRACK] campaign {campaign_id} not found")
            return

        tenant_id = camp.data[0]["tenant_id"]
        is_bot    = force_bot or _is_bot(user_agent, ip)

        # Bot detection for click: check if there was a recent open
        # If no open exists yet for this dispatch, it may be a scanner prefetch
        if event_type == "click":
            recent_open = db.client.table("email_events")\
                .select("id, created_at")\
                .eq("dispatch_id", dispatch_id)\
                .eq("event_type", "open")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if recent_open.data:
                import datetime
                open_ts = recent_open.data[0]["created_at"]
                # Parse open time and check if click happened < 2 seconds after open
                try:
                    from datetime import timezone
                    open_dt = datetime.datetime.fromisoformat(
                        open_ts.replace("Z", "+00:00")
                    )
                    now_dt = datetime.datetime.now(timezone.utc)
                    delta = (now_dt - open_dt).total_seconds()
                    if delta < 2:
                        is_bot = True  # Too fast → scanner
                except Exception:
                    pass

        db.client.table("email_events").insert({
            "tenant_id":   tenant_id,
            "campaign_id": campaign_id,
            "dispatch_id": dispatch_id,
            "contact_id":  contact_id,
            "event_type":  event_type,
            "url":         url,
            "ip_address":  ip,
            "user_agent":  user_agent,
            "is_bot":      is_bot,
        }).execute()

        logger.info(f"[TRACK] {event_type} | dispatch={dispatch_id} | bot={is_bot}")

    except Exception as e:
        logger.error(f"[TRACK] Failed to record {event_type} event: {e}")


# ── Open Tracking ──────────────────────────────────────────────────────────────

def _verify_signature(dispatch_id: str, payload: str | None, signature: str | None) -> None:
    if not signature:
        raise HTTPException(status_code=400, detail="missing signature")
    base = dispatch_id if payload is None else f"{dispatch_id}:{payload}"
    expected = hmac.new(TRACKING_SECRET.encode(), base.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="invalid signature")


@router.get("/open/{dispatch_id}")
@limiter.limit("5000/minute")
async def track_open(dispatch_id: str, request: Request, s: str | None = Query(None)):
    """
    Email open tracking pixel.
    Returns a 1×1 transparent GIF. Browser loads this image on email open.
    Records the open event in email_events (bot-filtered).
    """
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")

    _verify_signature(dispatch_id, None, s)

    _record_event(dispatch_id, "open", None, ip, user_agent)

    return Response(
        content=PIXEL_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        }
    )


# ── Click Tracking ─────────────────────────────────────────────────────────────

@router.get("/click")
@limiter.limit("5000/minute")
async def track_click(
    request: Request,
    u: str = Query(..., description="Destination URL (base64url encoded)"),
    d: str = Query(..., description="dispatch_id"),
    s: str | None = Query(None, description="HMAC signature"),
    hp: int | None = Query(None, description="Honeypot flag"),
):
    """
    Link click tracker.
    Called when a recipient clicks a link in the email.
    Records the click then immediately 302 redirects to the real destination.
    """
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")

    # Decode the destination URL
    padding = '=' * (-len(u) % 4)
    encoded = f"{u}{padding}"
    try:
        destination = base64.urlsafe_b64decode(encoded.encode()).decode()
    except Exception:
        destination = u  # Fallback: use as-is if decode fails

    _verify_signature(d, u, s)

    _record_event(d, "click", destination, ip, user_agent, force_bot=bool(hp))

    return RedirectResponse(url=destination, status_code=302)
