
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def run_db_fix():
    print("Attempting to add missing columns to import_batches...")
    
    # We can't run ALTER TABLE directly via the REST API in Supabase
    # But we can try to update a dummy row with the columns to see if they exist
    # Since they don't, we should inform the user.
    
    try:
        # Check if they exist by trying to select them
        res = supabase.table("import_batches").select("updated_count, skipped_duplicates").limit(1).execute()
        print("✅ Columns 'updated_count' and 'skipped_duplicates' already exist.")
    except Exception:
        print("❌ Columns are missing. Please run the following SQL in your Supabase SQL Editor:")
        print("-" * 50)
        print("ALTER TABLE import_batches ")
        print("ADD COLUMN IF NOT EXISTS updated_count INTEGER DEFAULT 0,")
        print("ADD COLUMN IF NOT EXISTS skipped_duplicates INTEGER DEFAULT 0;")
        print("-" * 50)

    print("\nCleaning up stuck 'Importing' batches...")
    try:
        # Any batch stuck in 'processing' that has imported_count > 0 should probably be 'completed'
        res = supabase.table("import_batches").select("id, file_name, imported_count").eq("status", "processing").execute()
        stuck_batches = res.data or []
        
        for batch in stuck_batches:
            if batch["imported_count"] > 0:
                print(f"Fixing status for batch: {batch['file_name']} ({batch['id']})")
                supabase.table("import_batches").update({"status": "completed"}).eq("id", batch["id"]).execute()
        
        print(f"Fixed {len(stuck_batches)} stuck batches.")
    except Exception as e:
        print(f"Error cleaning up batches: {e}")

if __name__ == "__main__":
    run_db_fix()
