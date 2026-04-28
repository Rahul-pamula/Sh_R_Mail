from fastapi import HTTPException
from typing import Set, Dict

# Finite State Machine for Campaigns
# draft -> awaiting_review -> approved -> sending -> sent
# awaiting_review -> draft (rejected)
ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    "draft": {"awaiting_review", "approved", "cancelled", "archived"},
    "awaiting_review": {"approved", "draft", "cancelled"},
    "approved": {"sending", "draft", "cancelled", "scheduled"},
    "scheduled": {"sending", "draft", "cancelled"},
    "sending": {"sent", "paused", "cancelled"},
    "paused": {"sending", "cancelled"},
    "sent": {"archived"},
    "cancelled": {"draft", "archived"},
    "archived": set()
}

def validate_campaign_transition(current_status: str, next_status: str):
    """
    Ensures that campaign status changes follow the strictly defined
    state machine to prevent logical corruption (e.g. approving a 'sent' campaign).
    """
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if next_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: '{current_status}' -> '{next_status}'."
        )
