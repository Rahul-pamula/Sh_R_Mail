import os
from dotenv import load_dotenv
from supabase import create_client
load_dotenv()
db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
plans = db.table("plans").select("*").execute()
for p in plans.data:
    print(p)
