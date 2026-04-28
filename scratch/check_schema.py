import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client
load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table("email_tasks").select("is_sent, dispatch_id, contact_id, tenant_id, sent_at").limit(1).execute()
print(res)
