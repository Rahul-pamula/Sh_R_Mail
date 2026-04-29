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
    Also triggers automated security alerts for critical events.
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
    
    # [AUDIT FIX 11] Automated Security Alerting
    try:
        await _process_security_alerts(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            metadata=metadata
        )
    except Exception:
        pass # Alerting failure should not block the main flow


async def _process_security_alerts(tenant_id: str, user_id: Optional[str], action: str, metadata: Optional[dict]) -> None:
    """Detects critical patterns in audit logs and triggers notifications."""
    from utils.notification_rules import notify_admins
    
    # 1. Critical Deletion Alert (>1000 items)
    if action in ["contact.bulk_delete", "contact.delete_all"]:
        count = (metadata or {}).get("count", 0)
        if count > 1000:
            await notify_admins(
                tenant_id=tenant_id,
                sender_id="system", # System-generated alert
                event_type="security_alert",
                title="🚨 Critical Security Alert: Bulk Deletion",
                message=f"A large bulk deletion was performed. {count:,} contacts were removed.",
                data={"action": action, "count": count, "performed_by": user_id}
            )

    # 2. Potential Compromise: Suspicious Login (Placeholder for more complex logic)
    # For now, we alert if a login occurs on a known suspicious action or high frequency.
    if action == "auth.suspicious_activity":
        await notify_admins(
            tenant_id=tenant_id,
            sender_id="system",
            event_type="security_alert",
            title="⚠️ Suspicious Activity Detected",
            message=f"Anomalous behavior detected for user session: {metadata.get('reason', 'Unknown')}",
            data=metadata
        )
