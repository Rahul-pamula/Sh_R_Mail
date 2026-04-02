"""
AUDIT LOG SERVICE
Phase 1.5 / 7.6 — Auth Security + Repository Architecture

Public-facing wrapper around AuditRepository.
Any route that needs to emit an audit event calls this module.

PRIVACY RULE: Never log PII (email bodies, CSV content, passwords).
Only log metadata: who did what, when, on which record.

Supported action names (extend as needed):
    auth.login                  auth.logout          auth.signup
    auth.password_reset_request auth.password_reset_complete
    auth.captcha_blocked        auth.rate_limit_blocked
    contact.import              contact.delete       contact.restore
    campaign.create             campaign.send        campaign.pause   campaign.cancel
    template.create             template.delete
    tenant.plan_change          tenant.upgrade
"""
from typing import Optional
from repositories.audit_repository import AuditRepository


async def write_log(
    tenant_id: str,
    action: str,
    *,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Convenience wrapper — writes an immutable audit log entry.

    Usage:
        await write_log(
            tenant_id=tenant_id,
            user_id=user_id,
            action="contact.delete",
            resource_type="contact",
            resource_id=contact_id,
            metadata={"count": 1}  # non-PII only
        )
    """
    from utils.supabase_client import db
    audit_repo = AuditRepository(db.client)
    audit_repo.insert_log(
        tenant_id=tenant_id,
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata,
        ip_address=ip_address,
        user_agent=user_agent,
    )
