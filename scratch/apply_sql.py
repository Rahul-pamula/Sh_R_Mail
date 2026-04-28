import os
import asyncio
import asyncpg
from dotenv import load_dotenv

async def main():
    load_dotenv()
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    with open("migrations/046_align_email_tasks.sql", "r") as f:
        sql = f.read()
    await conn.execute(sql)
    print("Migration applied via asyncpg!")
    await conn.close()

asyncio.run(main())
