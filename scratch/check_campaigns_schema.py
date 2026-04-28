from utils.supabase_client import db
import json

def check_schema():
    # Try to get one row to see columns
    res = db.client.table("campaigns").select("*").limit(1).execute()
    if res.data:
        print(json.dumps(res.data[0], indent=2))
    else:
        print("No data in campaigns table to infer schema.")

if __name__ == "__main__":
    check_schema()
