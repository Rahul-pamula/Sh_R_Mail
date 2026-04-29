"""
User Repository Layer
Phase 7.6 — Repository Architecture

Isolates all raw DB interactions related to the `users` table.
"""

from typing import Optional, Dict, Any

class UserRepository:
    def __init__(self, db_client):
        self.db = db_client

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        result = self.db.table("users").select("*").eq("email", email).execute()
        if result.data:
            return result.data[0]
        return None
        
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        result = self.db.table("users").select("*").eq("id", user_id).execute()
        if result.data:
            return result.data[0]
        return None

    def create_user(self, user_data: Dict[str, Any]) -> None:
        """Insert a new user record."""
        # Ensure token_version is set to 1 for new users
        if "token_version" not in user_data:
            user_data["token_version"] = 1
        self.db.table("users").insert(user_data).execute()

    def update_last_login(self, user_id: str, timestamp_iso: str) -> None:
        self.db.table("users").update({"last_login_at": timestamp_iso}).eq("id", user_id).execute()

    def update_theme(self, user_id: str, theme: str) -> None:
        self.db.table("users").update({"theme_preference": theme}).eq("id", user_id).execute()

    def increment_token_version(self, user_id: str) -> None:
        """Increment token_version to invalidate all active sessions for this user."""
        res = self.db.table("users").select("token_version").eq("id", user_id).execute()
        if res.data:
            new_version = (res.data[0].get("token_version") or 0) + 1
            self.db.table("users").update({"token_version": new_version}).eq("id", user_id).execute()
