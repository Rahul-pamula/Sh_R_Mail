import re
import os
from pathlib import Path
from typing import List, Dict, Any, Set

BASE_DIR = Path(__file__).resolve().parents[1]

class StrictAuditor:
    """
    The Auditor: Verifies deep implementation logic, not just file existence.
    Under-counts rather than over-counts to ensure truth.
    """
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.code_cache = {}
        self.signatures = self._gather_signatures()

    def _gather_signatures(self):
        sigs = {
            "routes": set(),
            "ui_components": set(),
            "logic_chunks": {}, # filename -> content
            "pages": set()
        }
        
        # Gather API Routes & Logic
        api_dir = self.root_dir / "platform/api/routes"
        if api_dir.exists():
            for f in api_dir.glob("*.py"):
                content = f.read_text()
                sigs["logic_chunks"][f.name] = content
                sigs["routes"].update(re.findall(r'@router\.(?:get|post|put|delete|patch)\("([^"]+)"', content))

        # Gather UI Components
        ui_dir = self.root_dir / "platform/client/src/components"
        if ui_dir.exists():
            for f in ui_dir.rglob("*.tsx"):
                sigs["ui_components"].add(f.name)
                # Cache content for logic check
                sigs["logic_chunks"][f.name] = f.read_text()

        # Gather Pages
        pages_dir = self.root_dir / "platform/client/src/app"
        if pages_dir.exists():
            for f in pages_dir.rglob("page.tsx"):
                rel = f.relative_to(pages_dir)
                sigs["pages"].add("/" + str(rel.parent).replace("\\", "/"))

        return sigs

    def audit_task(self, title: str) -> Dict[str, Any]:
        t = title.lower()
        
        # VALIDATION RULES (STRICT)
        
        # 1. AUTH / SIGNUP
        if "signup" in t or "auth" in t:
            has_route = any("/auth/signup" in r for r in self.signatures["routes"])
            has_ui = "AuthShell.tsx" in self.signatures["ui_components"]
            has_logic = "hash_password" in str(self.signatures["logic_chunks"].get("auth.py", ""))
            return self._finalize_status(has_route and has_ui and has_logic, has_ui or has_route)

        # 2. CONTACTS / IMPORT
        if "import" in t and "contact" in t:
            has_worker = "import_handler.py" in self.signatures["logic_chunks"]
            has_api = any("/contacts/upload" in r for r in self.signatures["routes"])
            logic_depth = "RabbitMQ" in str(self.signatures["logic_chunks"].get("import_handler.py", ""))
            return self._finalize_status(has_worker and has_api and logic_depth, has_api)

        # 3. CAMPAIGNS
        if "campaign" in t and "orchestration" in t:
            has_api = any("/campaigns" in r for r in self.signatures["routes"])
            has_logic = "CampaignRepository" in str(self.signatures["logic_chunks"].get("campaigns.py", ""))
            return self._finalize_status(has_api and has_logic, has_api)

        # 4. A/B TESTING (Example of strict missing)
        if "a/b" in t or "split test" in t:
            # We know it's missing from previous grep
            return self._finalize_status(False, False)

        # DEFAULT FALLBACK (Still strict)
        # Requires at least one UI component AND one API route/Logic chunk match
        has_ui = any(comp.lower().replace(".tsx", "") in t for comp in self.signatures["ui_components"])
        has_api = any(route.lower() in t.replace(" ", "/") for route in self.signatures["routes"])
        
        return self._finalize_status(has_ui and has_api, has_ui or has_api)

    def _finalize_status(self, is_done: bool, is_partial: bool) -> Dict[str, Any]:
        if is_done: return {"status": "done", "source": "code"}
        if is_partial: return {"status": "partial", "source": "code"}
        return {"status": "missing", "source": "plan"}

def generate_report():
    auditor = StrictAuditor(BASE_DIR)
    # ... (Phase parsing logic similar to before but using Auditor)
    # ... (Progress = sum(done) / total)
    pass

# (The rest of the script follows)
