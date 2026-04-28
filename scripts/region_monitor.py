import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from utils.db_engine import init_pool, get_conn, close_pool

logger = logging.getLogger(__name__)

async def region_heartbeat():
    """
    ESP-Grade Region Monitor.
    - Lease-Based Ownership: Regions must renew leases periodically.
    - Split-Brain Prevention: Only the 'Coordinator' region can reassign tasks.
    """
    await init_pool()
    current_region = os.getenv("CURRENT_REGION", "us-east-1")
    
    try:
        while True:
            async with get_conn() as conn:
                async with conn.transaction():
                    # 1. Heartbeat & Renew Lease for THIS region
                    await conn.execute("""
                        INSERT INTO region_heartbeats (region_name, last_seen_at, status)
                        VALUES ($1, NOW(), 'active')
                        ON CONFLICT (region_name) DO UPDATE SET last_seen_at = NOW(), status = 'active'
                    """, current_region)
                    
                    # 2. Coordinator Election (Simple Lock)
                    # Only one region at a time can be the 'reassigner'
                    await conn.execute("UPDATE region_heartbeats SET is_coordinator = FALSE WHERE is_coordinator = TRUE AND last_seen_at < NOW() - INTERVAL '30 seconds'")
                    await conn.execute("UPDATE region_heartbeats SET is_coordinator = TRUE WHERE region_name = $1 AND NOT EXISTS (SELECT 1 FROM region_heartbeats WHERE is_coordinator = TRUE)", current_region)
                    
                    is_coordinator = await conn.fetchval("SELECT is_coordinator FROM region_heartbeats WHERE region_name = $1", current_region)
                    
                    if is_coordinator:
                        # 3. Reclaim tasks from EXPIRED LEASES
                        dead_regions = await conn.fetch("""
                            SELECT region_name FROM region_heartbeats 
                            WHERE last_seen_at < NOW() - INTERVAL '60 seconds' AND status = 'active'
                        """)
                        
                        for reg in dead_regions:
                            logger.warning(f"🚨 Coordinator: Region {reg['region_name']} LEASE EXPIRED. Reclaiming tasks.")
                            
                            # Mark region down
                            await conn.execute("UPDATE region_heartbeats SET status = 'down' WHERE region_name = $1", reg["region_name"])
                            
                            # Reassign tasks with EXPIRED LEASES to THIS region
                            count = await conn.fetchval("""
                                UPDATE email_tasks 
                                SET region_owner = $1, region_lease_expiry = NOW() + INTERVAL '5 minutes'
                                WHERE region_owner = $2 AND region_lease_expiry < NOW()
                            """, current_region, reg["region_name"])
                            
                            logger.info(f"✅ Reclaimed {count} tasks from {reg['region_name']}")

            await asyncio.sleep(15) # Pulse every 15s
    except Exception as e:
        logger.error(f"Region Monitor Error: {e}")
    finally:
        await close_pool()

if __name__ == "__main__":
    asyncio.run(region_heartbeat())
