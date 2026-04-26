from fastapi import Depends, HTTPException, status
from utils.jwt_middleware import require_active_tenant, JWTPayload, verify_jwt_token

# Define standard RBAC actions
ACTIONS = [
    "ADD_DOMAIN", "VIEW_DOMAIN", "DELETE_DOMAIN",
    "ADD_FRANCHISE", "VIEW_FRANCHISE", "MANAGE_FRANCHISE",
    "VIEW_BILLING", "MANAGE_BILLING",
    "ADD_MANAGER", "ADD_MEMBER",
    "ADD_SENDER", "VIEW_SENDER",
    "VIEW_SETTINGS", "MANAGE_SETTINGS",
    "CREATE_CAMPAIGN", "VIEW_CAMPAIGN",
    "MANAGE_TEAM", "VIEW_TEAM",
    "MANAGE_CONTACT", "VIEW_CONTACT",
    "VIEW_ANALYTICS",
    "VIEW_ASSETS", "ADD_ASSETS",
    "VIEW_TEMPLATE", "MANAGE_TEMPLATE",
    "CHANGE_ISOLATION_MODEL"
]



def can(payload: JWTPayload, action: str) -> bool:
    """
    Core backend RBAC validator mirroring the frontend logic.
    """
    role = getattr(payload, "role", "MEMBER")
    workspace_type = payload.workspace_type
    
    # --------------------------------------------------
    # 1. STRICT WORKSPACE OVERRIDES
    # --------------------------------------------------
    # Franchises CANNOT manage parent infrastructure.
    if workspace_type == "FRANCHISE":
        if action in ["ADD_DOMAIN", "DELETE_DOMAIN", "ADD_FRANCHISE"]:
            return False

    # --------------------------------------------------
    # 2. ROLE-BASED ACCESS
    # --------------------------------------------------
    if role == "OWNER":
        return True
        
    if role == "MANAGER":
        return action in [
            "VIEW_DOMAIN", "ADD_MEMBER", "VIEW_SENDER", "VIEW_SETTINGS", "MANAGE_SETTINGS",
            "CREATE_CAMPAIGN", "VIEW_CAMPAIGN", "VIEW_TEAM",
            "MANAGE_CONTACT", "VIEW_CONTACT", "VIEW_ANALYTICS",
            "VIEW_ASSETS", "ADD_ASSETS", "VIEW_TEMPLATE", "MANAGE_TEMPLATE"
        ]
        
    if role == "MEMBER":
        return action in [
            "VIEW_CAMPAIGN", "VIEW_SENDER", "VIEW_TEAM", "VIEW_CONTACT", "VIEW_ANALYTICS",
            "VIEW_ASSETS", "VIEW_TEMPLATE"
        ]
        
    return False

def require_permission(action: str):
    """
    Dependency generator for FastAPI endpoints.
    """
    def permission_checker(jwt_payload: JWTPayload = Depends(verify_jwt_token)):
        if not can(jwt_payload, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
        return jwt_payload
    return permission_checker
