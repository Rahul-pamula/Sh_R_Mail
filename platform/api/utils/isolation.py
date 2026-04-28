from fastapi import HTTPException, status
from utils.supabase_client import db
from utils.jwt_middleware import JWTPayload

def assert_workspace_access(jwt_payload: JWTPayload, target_workspace_id: str):
    """
    STRICT Workspace Isolation Guard.
    Verifies that the authenticated user is a member of the target workspace.
    
    This must be called before ANY operation that targets a specific workspace_id
    that isn't already verified by the require_active_tenant middleware.
    """
    if jwt_payload.tenant_id != target_workspace_id:
        # Cross-tenant attempt detected.
        # Log this as a security event.
        print(f"SECURITY ALERT: User {jwt_payload.user_id} attempted cross-tenant access to {target_workspace_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace isolation violation. Access denied."
        )
    return True

async def assert_membership_exists(user_id: str, workspace_id: str):
    """Verifies that a user is part of a workspace via DB check."""
    res = db.client.table("tenant_users").select("id").eq("tenant_id", workspace_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this workspace."
        )
    return True
