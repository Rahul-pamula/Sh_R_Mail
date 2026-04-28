import asyncio
import os
import sys

# Ensure platform is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'platform', 'api')))

from utils.supabase_client import db

async def main():
    email = "rahulpamula123@gmail.com"
    user_res = db.client.table("users").select("*").eq("email", email).execute()
    print("USER:", user_res.data)
    
    if user_res.data:
        user_id = user_res.data[0]['id']
        tenant_res = db.client.table("tenants").select("*").eq("owner_id", user_id).execute()
        print("TENANT:", tenant_res.data)
        
        if tenant_res.data:
            tenant_id = tenant_res.data[0]['id']
            domain_res = db.client.table("domains").select("*").eq("tenant_id", tenant_id).execute()
            print("DOMAINS:", domain_res.data)
            
            contact_res = db.client.table("contacts").select("id", count="exact").eq("tenant_id", tenant_id).execute()
            print("CONTACTS COUNT:", contact_res.count)
            
            franchise_res = db.client.table("tenants").select("*").eq("parent_tenant_id", tenant_id).execute()
            print("FRANCHISES:", franchise_res.data)

if __name__ == "__main__":
    asyncio.run(main())
