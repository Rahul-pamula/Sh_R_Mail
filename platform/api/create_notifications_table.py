"""Create notifications table in Supabase."""
import asyncio
import asyncpg
import os

DB_URL = os.environ.get("DATABASE_URL")

SQL = """
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    sender_id UUID,
    type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
"""

async def run():
    conn = await asyncpg.connect(DB_URL, statement_cache_size=0)
    try:
        await conn.execute(SQL)
        print("SUCCESS — notifications table created")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await conn.close()

asyncio.run(run())
