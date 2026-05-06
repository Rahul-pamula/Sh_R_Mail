from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from repositories.audit_repository import AuditRepository
from utils.supabase_client import db


USER_STATUS_ACTIVE = "active"
USER_STATUS_PENDING_DELETION = "pending_deletion"
USER_STATUS_ANONYMIZED = "anonymized"

WORKSPACE_STATUS_ACTIVE = "active"
WORKSPACE_STATUS_PENDING_DELETION = "pending_deletion"

DELETION_GRACE_DAYS = 30


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _normalize_role(role: Optional[str]) -> str:
    value = (role or "viewer").lower()
    if value == "manager":
        return "admin"
    if value == "member":
        return "creator"
    return value


def _workspace_name(tenant: Dict[str, Any]) -> str:
    return (
        tenant.get("company_name")
        or tenant.get("workspace_name")
        or tenant.get("organization_name")
        or "Workspace"
    )


class AccountDeletionService:
    @staticmethod
    def _audit_repo() -> AuditRepository:
        return AuditRepository(db.client)

    @staticmethod
    def get_user_record(user_id: str) -> Dict[str, Any]:
        res = (
            db.client.table("users")
            .select("id, email, full_name, user_status, deletion_scheduled_at, is_active")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise ValueError("User not found.")
        user = res.data[0]
        user["user_status"] = user.get("user_status") or USER_STATUS_ACTIVE
        return user

    @staticmethod
    def _membership_rows(user_id: str) -> List[Dict[str, Any]]:
        res = (
            db.client.table("tenant_users")
            .select(
                "tenant_id, role, joined_at, "
                "tenants!inner(id, company_name, workspace_name, organization_name, status, workspace_status, deletion_scheduled_at)"
            )
            .eq("user_id", user_id)
            .execute()
        )
        return res.data or []

    @staticmethod
    def _tenant_user_rows(tenant_id: str) -> List[Dict[str, Any]]:
        res = (
            db.client.table("tenant_users")
            .select("user_id, role")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        return res.data or []

    @staticmethod
    def _workspace_impacts(user_id: str) -> List[Dict[str, Any]]:
        impacts: List[Dict[str, Any]] = []
        for membership in AccountDeletionService._membership_rows(user_id):
            tenant_blob = membership.get("tenants")
            if isinstance(tenant_blob, list):
                tenant = tenant_blob[0] if tenant_blob else {}
            else:
                tenant = tenant_blob or {}

            role = _normalize_role(membership.get("role"))
            tenant_id = membership["tenant_id"]
            members = AccountDeletionService._tenant_user_rows(tenant_id)
            member_count = len(members)
            owner_count = sum(1 for item in members if _normalize_role(item.get("role")) == "owner")
            admin_count = sum(1 for item in members if _normalize_role(item.get("role")) == "admin")

            outcome = "remove_membership"
            blocking_reason = None
            action_type = None

            if role == "owner":
                if member_count > 1:
                    outcome = "blocked"
                    blocking_reason = "Owner cannot delete account while this workspace has other members."
                    action_type = "transfer_ownership"
                else:
                    outcome = "pending_deletion"
            elif role == "admin" and admin_count <= 1:
                # Option B: Last admin is warned but not blocked, as long as an owner exists.
                # If there are no owners and no other admins, they are essentially a solo admin (similar to solo owner).
                if owner_count > 0:
                    outcome = "warning"
                    blocking_reason = "You are the last Admin. The Owner will need to appoint a successor."
                    action_type = "notify_owner"
                else:
                    # No owners and no other admins = effectively a solo workspace
                    outcome = "pending_deletion"

            impacts.append(
                {
                    "tenant_id": tenant_id,
                    "workspace_name": _workspace_name(tenant),
                    "role": role,
                    "member_count": member_count,
                    "owner_count": owner_count,
                    "admin_count": admin_count,
                    "workspace_status": tenant.get("workspace_status") or WORKSPACE_STATUS_ACTIVE,
                    "outcome": outcome,
                    "blocking_reason": blocking_reason,
                    "action_type": action_type,
                }
            )

        return impacts

    @staticmethod
    def build_preflight(user_id: str) -> Dict[str, Any]:
        user = AccountDeletionService.get_user_record(user_id)
        impacts = AccountDeletionService._workspace_impacts(user_id)

        blocking_reasons = []
        warnings = []
        actions_required = []
        pending_workspace_deletions = []

        for impact in impacts:
            if impact["outcome"] == "blocked":
                blocking_reasons.append(
                    {
                        "code": impact["action_type"],
                        "tenant_id": impact["tenant_id"],
                        "workspace_name": impact["workspace_name"],
                        "role": impact["role"],
                        "message": impact["blocking_reason"],
                    }
                )
                actions_required.append(
                    {
                        "type": impact["action_type"],
                        "tenant_id": impact["tenant_id"],
                        "workspace_name": impact["workspace_name"],
                        "cta_label": "Open Team Settings",
                        "cta_href": f"/settings/team?tenant_id={impact['tenant_id']}",
                    }
                )
            elif impact["outcome"] == "warning":
                warnings.append(
                    {
                        "tenant_id": impact["tenant_id"],
                        "workspace_name": impact["workspace_name"],
                        "message": impact["blocking_reason"],
                    }
                )
            elif impact["outcome"] == "pending_deletion":
                pending_workspace_deletions.append(
                    {
                        "tenant_id": impact["tenant_id"],
                        "workspace_name": impact["workspace_name"],
                        "message": "This solo-owned workspace will be marked pending deletion with your account.",
                    }
                )

        return {
            "account_status": user["user_status"],
            "deletion_scheduled_at": user.get("deletion_scheduled_at"),
            "can_request_deletion": user["user_status"] == USER_STATUS_ACTIVE and len(blocking_reasons) == 0,
            "blocking_reasons": blocking_reasons,
            "warnings": warnings,
            "actions_required": actions_required,
            "workspace_impacts": impacts,
            "pending_workspace_deletions": pending_workspace_deletions,
        }

    @staticmethod
    def _set_workspace_pending_deletion(tenant_id: str, scheduled_for: str) -> None:
        db.client.table("tenants").update(
            {
                "workspace_status": WORKSPACE_STATUS_PENDING_DELETION,
                "deletion_scheduled_at": scheduled_for,
                "updated_at": _iso(_utc_now()),
            }
        ).eq("id", tenant_id).execute()

    @staticmethod
    def _set_workspace_active(tenant_id: str) -> None:
        db.client.table("tenants").update(
            {
                "workspace_status": WORKSPACE_STATUS_ACTIVE,
                "deletion_scheduled_at": None,
                "updated_at": _iso(_utc_now()),
            }
        ).eq("id", tenant_id).execute()

    @staticmethod
    def revoke_refresh_tokens(user_id: str) -> None:
        db.client.table("refresh_tokens").update(
            {
                "revoked": True,
            }
        ).eq("user_id", user_id).execute()

    @staticmethod
    def request_deletion(user_id: str, *, actor_tenant_id: str, ip_address: Optional[str], user_agent: Optional[str]) -> Dict[str, Any]:
        user = AccountDeletionService.get_user_record(user_id)
        if user["user_status"] == USER_STATUS_ANONYMIZED:
            raise ValueError("This account has already been anonymized.")
        if user["user_status"] == USER_STATUS_PENDING_DELETION:
            raise ValueError("Account deletion is already scheduled.")

        preflight = AccountDeletionService.build_preflight(user_id)
        if not preflight["can_request_deletion"]:
            raise ValueError("Account deletion is blocked until required workspace actions are completed.")

        scheduled_for = _iso(_utc_now() + timedelta(days=DELETION_GRACE_DAYS))
        db.client.table("users").update(
            {
                "user_status": USER_STATUS_PENDING_DELETION,
                "deletion_scheduled_at": scheduled_for,
                "updated_at": _iso(_utc_now()),
            }
        ).eq("id", user_id).execute()

        # 1. Cascade Deletion for Solo Workspaces
        solo_owned_workspaces = [
            impact for impact in preflight["workspace_impacts"] if impact["outcome"] == "pending_deletion"
        ]
        for workspace in solo_owned_workspaces:
            AccountDeletionService._set_workspace_pending_deletion(workspace["tenant_id"], scheduled_for)

        # 2. Immediate Severance for Shared Workspaces (Admin/Member)
        shared_workspaces = [
            impact for impact in preflight["workspace_impacts"] 
            if impact["outcome"] in ("remove_membership", "warning")
        ]
        for workspace in shared_workspaces:
            db.client.table("tenant_users").delete().eq("user_id", user_id).eq("tenant_id", workspace["tenant_id"]).execute()

        AccountDeletionService.revoke_refresh_tokens(user_id)

        audit_repo = AccountDeletionService._audit_repo()
        memberships = preflight["workspace_impacts"]
        for membership in memberships:
            audit_repo.insert_log(
                tenant_id=membership["tenant_id"],
                action="account_deletion_requested",
                user_id=user_id,
                resource_type="user",
                resource_id=user_id,
                metadata={
                    "deletion_scheduled_at": scheduled_for,
                    "workspace_name": membership.get("workspace_name"),
                    "immediate_severance": membership["outcome"] in ("remove_membership", "warning")
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            if membership.get("outcome") == "pending_deletion":
                audit_repo.insert_log(
                    tenant_id=membership["tenant_id"],
                    action="workspace_pending_deletion",
                    user_id=user_id,
                    resource_type="tenant",
                    resource_id=membership["tenant_id"],
                    metadata={"deletion_scheduled_at": scheduled_for},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

        return {
            "message": "Account deletion scheduled.",
            "deletion_scheduled_at": scheduled_for,
            "workspace_impacts": preflight["workspace_impacts"],
        }

    @staticmethod
    def cancel_deletion(user_id: str, *, actor_tenant_id: str, ip_address: Optional[str], user_agent: Optional[str]) -> Dict[str, Any]:
        user = AccountDeletionService.get_user_record(user_id)
        if user["user_status"] != USER_STATUS_PENDING_DELETION:
            raise ValueError("Account deletion is not currently scheduled.")

        impacts = AccountDeletionService._workspace_impacts(user_id)
        db.client.table("users").update(
            {
                "user_status": USER_STATUS_ACTIVE,
                "deletion_scheduled_at": None,
                "updated_at": _iso(_utc_now()),
            }
        ).eq("id", user_id).execute()

        for impact in impacts:
            if impact["workspace_status"] == WORKSPACE_STATUS_PENDING_DELETION and impact["outcome"] == "pending_deletion":
                AccountDeletionService._set_workspace_active(impact["tenant_id"])

        audit_repo = AccountDeletionService._audit_repo()
        for membership in impacts:
            audit_repo.insert_log(
                tenant_id=membership["tenant_id"],
                action="account_deletion_cancelled",
                user_id=user_id,
                resource_type="user",
                resource_id=user_id,
                metadata={"workspace_name": membership.get("workspace_name")},
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return {"message": "Account deletion cancelled."}

    @staticmethod
    def anonymize_due_accounts(limit: int = 100) -> Dict[str, Any]:
        now_iso = _iso(_utc_now())
        res = (
            db.client.table("users")
            .select("id, user_status, deletion_scheduled_at")
            .eq("user_status", USER_STATUS_PENDING_DELETION)
            .lte("deletion_scheduled_at", now_iso)
            .limit(limit)
            .execute()
        )
        users = res.data or []
        processed = 0

        for user in users:
            user_id = user["id"]
            memberships = AccountDeletionService._workspace_impacts(user_id)

            audit_repo = AccountDeletionService._audit_repo()
            for membership in memberships:
                audit_repo.insert_log(
                    tenant_id=membership["tenant_id"],
                    action="account_anonymized",
                    user_id=user_id,
                    resource_type="user",
                    resource_id=user_id,
                    metadata={"workspace_name": membership.get("workspace_name")},
                )

            db.client.table("tenant_users").delete().eq("user_id", user_id).execute()
            AccountDeletionService.revoke_refresh_tokens(user_id)

            anonymized_payload = {
                "email": f"deleted_{user_id}@gdpr.invalid",
                "full_name": "Deleted User",
                "password_hash": None,
                "google_id": None,
                "github_id": None,
                "avatar_url": None,
                "user_status": USER_STATUS_ANONYMIZED,
                "deletion_scheduled_at": None,
                "is_active": False,
                "updated_at": now_iso,
            }
            try:
                db.client.table("users").update(anonymized_payload).eq("id", user_id).execute()
            except Exception:
                anonymized_payload.pop("avatar_url", None)
                db.client.table("users").update(anonymized_payload).eq("id", user_id).execute()

            processed += 1

        return {"processed": processed}
