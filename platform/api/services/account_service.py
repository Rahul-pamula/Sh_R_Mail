from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.plan_service import PlanService
from utils.supabase_client import db


PREFERENCE_TABLE = "user_preferences"
WORKSPACE_LOG_TABLE = "workspace_creation_logs"
DEFAULT_WORKSPACE_LIMIT = 10
WORKSPACE_CREATION_WINDOW_HOURS = 24
WORKSPACE_CREATION_LIMIT_PER_WINDOW = 3


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_join_record(record: Dict[str, Any]) -> Dict[str, Any]:
    tenant_data = record.get("tenants")
    if isinstance(tenant_data, list):
        tenant_data = tenant_data[0] if tenant_data else {}
    return tenant_data or {}


def _workspace_priority(status: str) -> int:
    if status == "active":
        return 3
    if status == "onboarding":
        return 2
    return 1


class AccountService:
    @staticmethod
    def get_last_active_tenant_id(user_id: str) -> Optional[str]:
        try:
            res = (
                db.client.table(PREFERENCE_TABLE)
                .select("last_active_tenant_id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception:
            return None

        if not res.data:
            return None
        return res.data[0].get("last_active_tenant_id")

    @staticmethod
    def set_last_active_tenant_id(user_id: str, tenant_id: str) -> None:
        payload = {
            "user_id": user_id,
            "last_active_tenant_id": tenant_id,
            "updated_at": _utc_now().isoformat(),
        }
        try:
            existing = (
                db.client.table(PREFERENCE_TABLE)
                .select("user_id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                db.client.table(PREFERENCE_TABLE).update(payload).eq("user_id", user_id).execute()
            else:
                payload["created_at"] = payload["updated_at"]
                db.client.table(PREFERENCE_TABLE).insert(payload).execute()
        except Exception:
            # Keep the account layer resilient while older environments catch up on schema.
            return

    @staticmethod
    def list_workspaces(user_id: str) -> List[Dict[str, Any]]:
        memberships = (
            db.client.table("tenant_users")
            .select(
                "tenant_id, role, isolation_model, joined_at, "
                "tenants!inner(id, company_name, workspace_name, organization_name, status, workspace_type, onboarding_required)"
            )
            .eq("user_id", user_id)
            .execute()
        )

        membership_rows = memberships.data or []
        if not membership_rows:
            return []

        tenant_ids = [row["tenant_id"] for row in membership_rows]
        last_active_tenant_id = AccountService.get_last_active_tenant_id(user_id)

        plans_by_tenant: Dict[str, str] = {}
        try:
            tenants_with_plan = (
                db.client.table("tenants")
                .select("id, plans!tenants_plan_id_fkey(name)")
                .in_("id", tenant_ids)
                .execute()
            )
            for tenant in tenants_with_plan.data or []:
                plan_info = tenant.get("plans") or {}
                plans_by_tenant[tenant["id"]] = plan_info.get("name", "Free")
        except Exception:
            for tenant_id in tenant_ids:
                try:
                    plans_by_tenant[tenant_id] = PlanService.get_tenant_plan_details(tenant_id).get("plan", {}).get("name", "Free")
                except Exception:
                    plans_by_tenant[tenant_id] = "Free"

        workspaces: List[Dict[str, Any]] = []
        for row in membership_rows:
            tenant = _coerce_join_record(row)
            workspace_name = (
                tenant.get("company_name")
                or tenant.get("workspace_name")
                or tenant.get("organization_name")
                or "Unnamed Workspace"
            )
            workspaces.append(
                {
                    "tenant_id": row["tenant_id"],
                    "workspace_name": workspace_name,
                    "role": row.get("role"),
                    "status": tenant.get("status", "active"),
                    "workspace_type": tenant.get("workspace_type", "MAIN"),
                    "onboarding_required": tenant.get("status") == "onboarding" or bool(tenant.get("onboarding_required")),
                    "plan": plans_by_tenant.get(row["tenant_id"], "Free"),
                    "joined_at": row.get("joined_at"),
                    "is_last_active": row["tenant_id"] == last_active_tenant_id,
                }
            )

        workspaces.sort(
            key=lambda workspace: (
                1 if workspace["is_last_active"] else 0,
                _workspace_priority(workspace["status"]),
                workspace.get("joined_at") or "",
            ),
            reverse=True,
        )
        return workspaces

    @staticmethod
    def resolve_preferred_workspace(user_id: str) -> Optional[Dict[str, Any]]:
        workspaces = AccountService.list_workspaces(user_id)
        return workspaces[0] if workspaces else None

    @staticmethod
    def list_invitations(email: str) -> List[Dict[str, Any]]:
        now_iso = _utc_now().isoformat()
        invite_res = (
            db.client.table("team_invitations")
            .select("id, tenant_id, franchise_tenant_id, email, role, isolation_model, token, expires_at, inviter_id, invite_type")
            .eq("email", email)
            .eq("status", "pending")
            .gt("expires_at", now_iso)
            .order("expires_at", desc=False)
            .execute()
        )

        invites = invite_res.data or []
        if not invites:
            return []

        target_tenant_ids = [
            invite.get("franchise_tenant_id") if invite.get("invite_type") == "franchise" else invite.get("tenant_id")
            for invite in invites
        ]
        target_tenant_ids = [tenant_id for tenant_id in target_tenant_ids if tenant_id]

        tenants_by_id: Dict[str, Dict[str, Any]] = {}
        if target_tenant_ids:
            tenant_res = (
                db.client.table("tenants")
                .select("id, company_name, workspace_name, organization_name, status")
                .in_("id", target_tenant_ids)
                .execute()
            )
            tenants_by_id = {tenant["id"]: tenant for tenant in (tenant_res.data or [])}

        inviter_ids = [invite.get("inviter_id") for invite in invites if invite.get("inviter_id")]
        inviters_by_id: Dict[str, Dict[str, Any]] = {}
        if inviter_ids:
            inviter_res = (
                db.client.table("users")
                .select("id, full_name, email")
                .in_("id", inviter_ids)
                .execute()
            )
            inviters_by_id = {inviter["id"]: inviter for inviter in (inviter_res.data or [])}

        results: List[Dict[str, Any]] = []
        for invite in invites:
            target_tenant_id = invite.get("franchise_tenant_id") if invite.get("invite_type") == "franchise" else invite.get("tenant_id")
            tenant = tenants_by_id.get(target_tenant_id or "", {})
            inviter = inviters_by_id.get(invite.get("inviter_id") or "", {})
            results.append(
                {
                    "id": invite["id"],
                    "tenant_id": target_tenant_id,
                    "email": invite["email"],
                    "role": invite.get("role"),
                    "invite_type": invite.get("invite_type", "team"),
                    "workspace_name": tenant.get("company_name") or tenant.get("workspace_name") or tenant.get("organization_name") or "Workspace",
                    "workspace_status": tenant.get("status", "active"),
                    "token": invite.get("token"),
                    "expires_at": invite.get("expires_at"),
                    "inviter_name": inviter.get("full_name") or inviter.get("email"),
                }
            )
        return results

    @staticmethod
    def decline_invitation(*, email: str, invitation_id: str) -> Dict[str, Any]:
        invite_res = (
            db.client.table("team_invitations")
            .select("id, tenant_id, franchise_tenant_id, email, status, expires_at, invite_type")
            .eq("id", invitation_id)
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not invite_res.data:
            raise ValueError("Invitation not found.")

        invite = invite_res.data[0]
        expires_at = invite.get("expires_at")
        invite_expired = False
        if expires_at:
            expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            invite_expired = expires_dt < _utc_now()

        if invite.get("status") != "pending" or invite_expired:
            raise ValueError("Invitation is no longer pending.")

        db.client.table("team_invitations").update({"status": "rejected"}).eq("id", invitation_id).execute()

        target_tenant_id = invite.get("franchise_tenant_id") if invite.get("invite_type") == "franchise" else invite.get("tenant_id")
        return {
            "message": "Invitation declined.",
            "tenant_id": target_tenant_id,
        }

    @staticmethod
    def check_workspace_creation_allowed(user_id: str) -> Dict[str, Any]:
        workspaces = AccountService.list_workspaces(user_id)
        if len(workspaces) >= DEFAULT_WORKSPACE_LIMIT:
            return {
                "allowed": False,
                "reason": "WORKSPACE_LIMIT_REACHED",
                "message": f"You can create up to {DEFAULT_WORKSPACE_LIMIT} workspaces per account.",
            }

        window_start = (_utc_now() - timedelta(hours=WORKSPACE_CREATION_WINDOW_HOURS)).isoformat()
        try:
            recent = (
                db.client.table(WORKSPACE_LOG_TABLE)
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("created_at", window_start)
                .execute()
            )
            recent_count = recent.count or 0
        except Exception:
            recent_count = 0

        if recent_count >= WORKSPACE_CREATION_LIMIT_PER_WINDOW:
            return {
                "allowed": False,
                "reason": "RATE_LIMITED",
                "message": "Too many workspaces created recently. Please wait before creating another workspace.",
            }

        return {"allowed": True}

    @staticmethod
    def log_workspace_creation(user_id: str, tenant_id: str, ip_address: Optional[str]) -> None:
        try:
            db.client.table(WORKSPACE_LOG_TABLE).insert(
                {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "created_at": _utc_now().isoformat(),
                    "ip_address": ip_address,
                }
            ).execute()
        except Exception:
            return
