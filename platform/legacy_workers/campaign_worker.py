import time
from uuid import uuid4
from datetime import datetime
from utils.supabase_client import db
import logging
import random
import re

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("CampaignWorker")

def process_spintax(text: str) -> str:
    """Process Spintax: {Hello|Hi|Hey} -> randomly picks one"""
    if not text: return ""
    pattern = r'\{([^{}]+)\}'
    def replace_spintax(match):
        options = match.group(1).split('|')
        return random.choice(options)
    while re.search(pattern, text):
        text = re.sub(pattern, replace_spintax, text)
    return text

def process_merge_tags(text: str, contact: dict) -> str:
    """Process merge tags: {{first_name}} -> actual value"""
    if not text: return ""
    pattern = r'\{\{(\w+)(?:\|([^}]+))?\}\}'
    def replace_tag(match):
        field = match.group(1)
        fallback = match.group(2) or ""
        return str(contact.get(field, fallback) or fallback)
    return re.sub(pattern, replace_tag, text)

# Mocked for now - we don't have segmentation yet, so we get ALL contacts for tenant
def get_contacts_for_campaign(tenant_id: str, list_id: str = None):
    # In V1: Project ID = Tenant ID. So we get contacts where project_id = tenant_id.
    result = db.client.table("contacts").select("*").eq("project_id", tenant_id).execute()
    return result.data if result.data else []

def process_campaigns():
    """
    Main loop:
    1. Find campaigns with status='processing'
    2. Generate Tasks
    3. Update status='sending'
    """
    logger.info("Checking for pending campaigns...")
    
    # 1. Fetch campaigns to process
    campaigns = db.client.table("campaigns").select("*").eq("status", "processing").execute()
    
    for campaign in campaigns.data:
        campaign_id = campaign['id']
        tenant_id = campaign['tenant_id']
        logger.info(f"Processing Campaign: {campaign['name']} ({campaign_id})")
        
        # 2. Get Snapshot
        snapshot_res = db.client.table("campaign_snapshots").select("*").eq("campaign_id", campaign_id).order("created_at", desc=True).limit(1).execute()
        
        if not snapshot_res.data:
            logger.error(f"No snapshot found for campaign {campaign_id}. Skipping.")
            continue
            
        snapshot = snapshot_res.data[0]
        body_template = snapshot['body_snapshot']
        subject_template = snapshot['subject_snapshot']
        
        # 3. Get Contacts
        contacts = get_contacts_for_campaign(tenant_id)
        logger.info(f"Found {len(contacts)} contacts.")
        
        if not contacts:
             # No contacts? Mark as sent (empty)
            db.client.table("campaigns").update({"status": "sent"}).eq("id", campaign_id).execute()
            continue

        # 4. Generate Tasks
        email_tasks = []
        for contact in contacts:
            email = contact['email']
            domain = email.split('@')[-1] if '@' in email else 'unknown'
            isp = 'gmail' if 'gmail' in domain else 'outlook' if 'outlook' in domain else 'yahoo' if 'yahoo' in domain else 'other'
            
            # Rendering
            html_content = process_spintax(body_template)
            html_content = process_merge_tags(html_content, contact)
            
            subject = process_spintax(subject_template)
            subject = process_merge_tags(subject, contact)
            
            task = {
                "trace_id": str(uuid4()),
                "tenant_id": tenant_id, # Keep task isolated
                "project_id": tenant_id,
                "campaign_id": campaign_id,
                "snapshot_id": snapshot['id'],
                "recipient_email": email,
                "recipient_domain": domain,
                "recipient_isp": isp,
                "status": "pending",
                "payload_rendered": html_content
            }
            email_tasks.append(task)
            
        # Bulk Insert
        # Supabase API limits might require batching, but for <1000 contacts this is fine.
        # In production -> batch by 100
        batch_size = 100
        for i in range(0, len(email_tasks), batch_size):
            batch = email_tasks[i:i + batch_size]
            db.client.table("email_tasks").insert(batch).execute()
            logger.info(f"Inserted batch {i} to {i+len(batch)}")
            
        # 5. Update Status
        db.client.table("campaigns").update({"status": "sending"}).eq("id", campaign_id).execute()
        logger.info(f"Campaign {campaign_id} moved to 'sending'.")
        
if __name__ == "__main__":
    while True:
        try:
            process_campaigns()
        except Exception as e:
            logger.error(f"Worker Error: {e}")
        
        time.sleep(10) # Poll every 10s
