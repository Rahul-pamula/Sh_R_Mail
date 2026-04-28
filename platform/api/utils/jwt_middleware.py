"""
JWT MIDDLEWARE & VALIDATION
Tenant Isolation Security Layer

Features:
- Extract and validate JWT from Authorization header
- Verify tenant_id from JWT (authoritative)
- Prevent header spoofing (X-Tenant-ID must match JWT)
- Dependency injection for protected routes
"""

from fastapi import Header, HTTPException, status, Depends
from jose import JWTError, jwt
from typing import Optional
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"


class JWTPayload:
    """Validated JWT payload & DB Context"""
    def __init__(self, user_id: str, tenant_id: str, email: str, role: str, workspace_type: str, tenant_status: str, onboarding_required: bool, isolation_model: str = "team"):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.email = email
        self.role = role
        self.workspace_type = workspace_type
        self.tenant_status = tenant_status
        self.onboarding_required = onboarding_required
        self.isolation_model = isolation_model

    @property
    def ui_role(self) -> str:
        """Return the role name formatted for the frontend (e.g. MAIN_OWNER, FRANCHISE_OWNER)."""
        if self.role == "OWNER":
            return f"{self.workspace_type}_OWNER"
        return self.role


def normalize_public_role(role: Optional[str]) -> Optional[str]:
    """Expose public-facing role names. Backward-compat: 'admin' was sometimes stored as 'manager'."""
    if role == "manager":
        return "admin"
    return role


def normalize_storage_role(role: Optional[str]) -> Optional[str]:
    """Map public-facing role names back to stored values when needed."""
    return role


def verify_jwt_token(authorization: str = Header(..., alias="Authorization")) -> JWTPayload:
    """
    Verify JWT token from Authorization header.
    
    Returns validated payload with user_id, tenant_id, email, role.
    Raises HTTPException if token is invalid or missing.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    
    try:
        # Decode and verify JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract required fields from JWT (Identity)
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")
        email = payload.get("email")
        
        if not all([user_id, tenant_id, email]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing required identity fields"
            )

        # SECURITY: Fetch Authority from DB.
        from utils.supabase_client import db
        tu_res = db.client.table("tenant_users").select("role, isolation_model").eq("user_id", user_id).eq("tenant_id", tenant_id).execute()
        
        db_role = "viewer"
        isolation_model = "team"
        workspace_type = "MAIN"
        raw_workspace_type = "MAIN"
        tenant_status = "active"
        onboarding_required = True
        is_member = False

        if tu_res.data:
            is_member = True
            db_role = normalize_public_role(tu_res.data[0].get("role", "viewer"))
            isolation_model = tu_res.data[0].get("isolation_model", "team")

            t_res = db.client.table("tenants").select("workspace_type, status, onboarding_required").eq("id", tenant_id).execute()
            if t_res.data:
                tenant_info = t_res.data[0]
                raw_workspace_type = tenant_info.get("workspace_type") or "MAIN"
                tenant_status = tenant_info.get("status", "active")
                onboarding_required = tenant_info.get("onboarding_required", False)
                
                # FAIL CLOSED: if workspace_type is null/missing/unrecognized, deny access.
                if raw_workspace_type.upper() not in ("MAIN", "PRIMARY", "FRANCHISE"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
                
                workspace_type = "FRANCHISE" if raw_workspace_type.upper() == "FRANCHISE" else "MAIN"
        else:
            # User is not a member of this tenant. 
            u_res = db.client.table("users").select("id").eq("id", user_id).execute()
            if not u_res.data:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
            
            onboarding_required = True
            tenant_status = "pending"
            raw_workspace_type = "MAIN"
            workspace_type = "MAIN"

        # Normalize role to uppercase: OWNER | ADMIN | CREATOR | VIEWER
        normalized_role = "VIEWER"
        db_role_lower = db_role.lower()
        if db_role_lower == "owner":
            normalized_role = "OWNER"
        elif db_role_lower == "admin":
            normalized_role = "ADMIN"
        elif db_role_lower == "creator":
            normalized_role = "CREATOR"
        elif db_role_lower == "viewer":
            normalized_role = "VIEWER"
        else:
            # Backward compatibility: 'manager' → ADMIN, 'member' → CREATOR
            if db_role_lower in ("manager",):
                normalized_role = "ADMIN"
            elif db_role_lower in ("member",):
                normalized_role = "CREATOR"
            else:
                normalized_role = "VIEWER"

        return JWTPayload(
            user_id=user_id,
            tenant_id=tenant_id,
            email=email,
            role=normalized_role,
            workspace_type=workspace_type,
            tenant_status=tenant_status,
            onboarding_required=onboarding_required,
            isolation_model=isolation_model
        )
        
    except HTTPException:
        raise  # Re-raise our own exceptions untouched
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_tenant_id_with_validation(
    jwt_payload: JWTPayload = Depends(verify_jwt_token),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    Get tenant_id from JWT (authoritative source).
    
    CRITICAL SECURITY:
    - tenant_id comes from JWT (cannot be spoofed)
    - If X-Tenant-ID header is present, it MUST match JWT
    - This prevents header spoofing and debug confusion
    
    Phase 1 (current): Accept both JWT and header, validate match
    Phase 2 (future): Warn if header is used
    Phase 3 (future): Reject header entirely
    """
    tenant_id = jwt_payload.tenant_id
    
    # SECURITY: If header is present, it MUST match JWT
    if x_tenant_id and x_tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant ID mismatch: header={x_tenant_id}, JWT={tenant_id}. JWT is authoritative."
        )
    
    return tenant_id


def require_active_tenant(
    jwt_payload: JWTPayload = Depends(verify_jwt_token),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    PRODUCTION-GRADE DEPENDENCY: Require active tenant with JWT verification.
    
    This is the PRIMARY dependency for all protected routes.
    
    Security guarantees:
    1. JWT must be present and valid
    2. tenant_id comes from JWT (authoritative)
    3. Header must match JWT if present (prevents spoofing)
    4. Tenant must be in 'active' status
    5. Returns tenant_id for use in route
    
    Use this on:
    - /campaigns/*
    - /contacts/*
    - /analytics/*
    - Any route that requires completed onboarding
    """
    from utils.supabase_client import db
    
    # Get tenant_id from JWT (authoritative)
    tenant_id = jwt_payload.tenant_id
    
    # SECURITY: Validate header matches JWT if present
    if x_tenant_id and x_tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant ID mismatch: header={x_tenant_id}, JWT={tenant_id}. JWT is authoritative."
        )
    
    # Check tenant exists and get status
    try:
        tenant_result = db.client.table("tenants").select("status").eq("id", tenant_id).execute()
    except Exception as e:
        # Catch httpx.ReadError or connection limits and return a 503
        raise HTTPException(
            status_code=503,
            detail="Database connection temporarily unavailable. Please try again."
        )
    
    if not tenant_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    tenant_status = tenant_result.data[0]["status"]
    
    # CRITICAL: Only active tenants can access protected features
    if tenant_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    
    return tenant_id


def require_authenticated_user(
    jwt_payload: JWTPayload = Depends(verify_jwt_token)
) -> JWTPayload:
    """
    Require authenticated user (any tenant status).
    
    Use this for:
    - /onboarding/* routes (need auth but not active status)
    - /auth/me
    - Profile routes
    """
    return jwt_payload

def require_admin_or_owner(jwt_payload: JWTPayload = Depends(verify_jwt_token)) -> JWTPayload:
    """
    Require the user to have 'manager' or 'owner' role.
    Use this for destructive actions, domain management, team invites, etc.
    """
    if jwt_payload.role not in ["MANAGER", "OWNER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return jwt_payload

def apply_data_isolation(query_builder, jwt_payload: JWTPayload):
    """
    Modifies a Supabase query builder to enforce Agency vs Team isolation rules.
    Reads the isolation model directly from the JWT.
    
    - Owner/Manager: See all rows.
    - Agency + Member: See only their own rows.
    - Team + Member: See all rows.
    """
    role = jwt_payload.role
    user_id = jwt_payload.user_id
    model = getattr(jwt_payload, "isolation_model", "team")
    
    # 1. SOFT DELETE: Handled explicitly by individual services/routes if schema supports it
    if role in ["OWNER", "ADMIN"]:
        return query_builder
        
    if model == "agency":
        query_builder = query_builder.eq("created_by_user_id", user_id)
        
    return query_builder
