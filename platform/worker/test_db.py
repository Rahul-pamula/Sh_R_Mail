from utils.supabase_client import db
import asyncio
from utils.db_engine import get_conn

async def main():
    async with get_conn() as conn:
        res = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        for r in res:
            print(r["table_name"])

asyncio.run(main())
