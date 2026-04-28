import asyncio
import os
from utils.db_engine import init_pool, execute, close_pool

async def run_migrations():
    await init_pool()
    
    # 1. Soft Delete columns
    tables_to_soft_delete = ["campaigns", "contacts", "domains"]
    for table in tables_to_soft_delete:
        try:
            print(f"Adding deleted_at to {table}...")
            await execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL")
        except Exception as e:
            print(f"Error adding deleted_at to {table}: {e}")

    # 2. Invite Expiry
    try:
        print("Adding expires_at to team_invitations...")
        await execute("ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NULL")
        # Set default expiry for existing invites (48 hours from creation)
        await execute("UPDATE team_invitations SET expires_at = created_at + interval '48 hours' WHERE expires_at IS NULL")
    except Exception as e:
        print(f"Error adding expires_at: {e}")

    # 3. Ensure audit_logs has metadata as jsonb
    try:
        print("Ensuring audit_logs schema is correct...")
        # (Assuming it exists, just hardening)
        await execute("ALTER TABLE audit_logs ALTER COLUMN metadata TYPE JSONB USING metadata::jsonb")
    except Exception as e:
        print(f"Error updating audit_logs: {e}")

    await close_pool()

if __name__ == "__main__":
    asyncio.run(run_migrations())
