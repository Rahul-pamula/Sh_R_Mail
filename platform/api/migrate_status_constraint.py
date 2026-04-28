import asyncio
import asyncpg
import os

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.iiweorjzoxcfaedsubxu:email_engine123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
)

async def run():
    conn = await asyncpg.connect(DB_URL)
    try:
        row = await conn.fetchrow(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'campaigns_status_check'"
        )
        print("Current constraint:", row[0] if row else "NOT FOUND")

        await conn.execute("ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check")

        await conn.execute(
            "ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check "
            "CHECK (status IN ('draft','scheduled','sending','sent','paused','cancelled','archived','awaiting_review','approved'))"
        )
        print("SUCCESS — constraint updated to include awaiting_review and approved")
    except Exception as e:
        print("ERROR:", e)
    finally:
        await conn.close()

asyncio.run(run())
