"""
Account Deletion Worker

Run from cron / scheduler every hour (or daily):
    python platform/worker/account_deletion_worker.py

Processes users whose 30-day account deletion grace period has elapsed,
then anonymizes their identity while preserving referential integrity.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env", override=True)
sys.path.insert(0, str(ROOT / "platform" / "api"))

from services.account_deletion_service import AccountDeletionService  # noqa: E402


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ACCOUNT_DELETION_WORKER] %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    batch_size = int(os.getenv("ACCOUNT_DELETION_BATCH_SIZE", "100"))
    result = AccountDeletionService.anonymize_due_accounts(limit=batch_size)
    logger.info("Processed %s due account deletion(s).", result.get("processed", 0))


if __name__ == "__main__":
    main()
