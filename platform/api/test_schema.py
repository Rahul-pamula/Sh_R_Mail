import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'platform', 'api')))

from utils.supabase_client import db

async def main():
    domains = db.client.table("domains").select("*").limit(1).execute()
    print("DOMAINS KEYS:", domains.data[0].keys() if domains.data else "No data")
    contacts = db.client.table("contacts").select("*").limit(1).execute()
    print("CONTACTS KEYS:", contacts.data[0].keys() if contacts.data else "No data")
    campaigns = db.client.table("campaigns").select("*").limit(1).execute()
    print("CAMPAIGNS KEYS:", campaigns.data[0].keys() if campaigns.data else "No data")

if __name__ == "__main__":
    asyncio.run(main())
