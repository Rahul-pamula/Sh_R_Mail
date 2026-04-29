import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

client = create_client(url, key)

sql = "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;"

print("🔄 Applying [AUDIT FIX 2] token_version migration...")
try:
    # Try using RPC if available
    client.rpc("exec_sql", {"query": sql}).execute()
    print("✅ Migration applied successfully via RPC.")
except Exception as e:
    print(f"❌ Failed via RPC: {e}")
    print("Attempting to run as raw query (if supported by client)...")
    try:
        # Some clients support direct execution in certain environments, but usually not PostgREST.
        # This is a fallback attempt.
        client.table("users").select("id").limit(1).execute() # Just to verify connection
        print("Connection verified. Please ensure the column is added manually if RPC 'exec_sql' is missing.")
    except Exception as e2:
        print(f"❌ Connection failed: {e2}")
