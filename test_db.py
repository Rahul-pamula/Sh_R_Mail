import asyncio
from platform.api.utils.supabase_client import db

async def main():
    res = db.client.table("users").select("email, email_verified").eq("email", "rayapureddynithin@gmail.com").execute()
    print("USER STATUS:", res.data)

asyncio.run(main())
