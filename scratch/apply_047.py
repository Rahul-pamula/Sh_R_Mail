import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add api to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "platform" / "api"))
from utils.db_engine import init_pool, execute, close_pool

async def apply():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    await init_pool()
    
    migration_path = Path(__file__).resolve().parents[1] / "migrations" / "047_email_tasks_hardening.sql"
    with open(migration_path, "r") as f:
        sql = f.read()
    
    print(f"Applying migration: {migration_path.name}")
    # Split by ; and execute chunks to avoid some asyncpg issues with multi-statement strings if they contain DO blocks
    # Actually, asyncpg.execute() handles multi-statement strings fine if not using params.
    try:
        from utils.db_engine import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.execute(sql)
        print("✅ Migration applied successfully.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        await close_pool()

if __name__ == "__main__":
    asyncio.run(apply())
