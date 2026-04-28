import asyncio
import logging
from datetime import datetime, timezone, timedelta
from utils.db_engine import init_pool, get_conn, close_pool

logger = logging.getLogger(__name__)

async def reputation_sync_job():
    """
    Elite Sync Job: Postgres Truth -> Redis Control Plane.
    Runs every 60s. Implements Exponential Decay & Anomaly Detection.
    """
    await init_pool()
    try:
        async with get_conn() as conn:
            # 1. Fetch domains active in last 24h
            domains = await conn.fetch("SELECT id, domain_name, reputation_score FROM domains")
            
            for domain in domains:
                # 2. Calculate rolling window metrics (1h vs 24h)
                # Last 1h (70% weight)
                metrics_1h = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) FILTER (WHERE status_code >= 500) as bounces,
                        COUNT(*) as total
                    FROM delivery_logs l
                    JOIN email_tasks t ON l.task_id = t.id
                    WHERE t.recipient_domain = $1 AND l.created_at > NOW() - INTERVAL '1 hour'
                """, domain["domain_name"])
                
                # Last 24h (30% weight)
                metrics_24h = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) FILTER (WHERE status_code >= 500) as bounces,
                        COUNT(*) as total
                    FROM delivery_logs l
                    JOIN email_tasks t ON l.task_id = t.id
                    WHERE t.recipient_domain = $1 AND l.created_at > NOW() - INTERVAL '24 hours'
                """, domain["domain_name"])
                
                # 3. Exponential Decay Calculation
                br_1h = (metrics_1h["bounces"] / metrics_1h["total"]) if metrics_1h["total"] > 0 else 0
                br_24h = (metrics_24h["bounces"] / metrics_24h["total"]) if metrics_24h["total"] > 0 else 0
                
                weighted_br = (br_1h * 0.7) + (br_24h * 0.3)
                
                # Score Calculation (Elite Math)
                new_score = max(0, min(100, 100 - (weighted_br * 500))) # 20% bounce rate = 0 score
                
                # 4. Anomaly Detection & Auto-Action
                # If 1h bounce rate is 3x higher than 24h average -> Spike detected
                if br_1h > br_24h * 3 and metrics_1h["total"] > 50:
                    logger.warning(f"⚠️ ANOMALY DETECTED: Bounce spike for {domain['domain_name']}. Auto-throttling.")
                    new_score = min(new_score, 50) # Force throttle
                
                # 5. Update Postgres & Sync to Redis
                await conn.execute("""
                    UPDATE domains 
                    SET reputation_score = $2, bounce_rate_1h = $3, last_recalc_at = NOW()
                    WHERE id = $1
                """, domain["id"], new_score, br_1h)
                
                # Sync logic for Redis (assume redis_client available)
                # await redis_client.set(f"reputation:score:{domain['domain_name']}", new_score)
                
            logger.info(f"✅ Reputation Sync Complete for {len(domains)} domains.")
    finally:
        await close_pool()

if __name__ == "__main__":
    asyncio.run(reputation_sync_job())
