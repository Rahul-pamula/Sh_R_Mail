import re
import os
from pathlib import Path
from typing import List, Dict, Any, Set

class CodebaseIntelligence:
    """
    Scans the codebase for physical evidence of features.
    Matches code signatures to plan tasks.
    """
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.signatures = {
            "api_routes": set(),
            "ui_components": set(),
            "worker_handlers": set(),
            "pages": set(),
            "services": set()
        }
        self.scan_all()

    def scan_all(self):
        # 1. Scan API Routes
        api_dir = self.root_dir / "platform/api/routes"
        if api_dir.exists():
            for f in api_dir.glob("*.py"):
                content = f.read_text()
                routes = re.findall(r'@router\.(?:get|post|put|delete|patch)\("([^"]+)"', content)
                for r in routes:
                    self.signatures["api_routes"].add(r)
                # Also track the filename as a feature
                self.signatures["services"].add(f.stem)

        # 2. Scan UI Components
        comp_dir = self.root_dir / "platform/client/src/components"
        if comp_dir.exists():
            for f in comp_dir.rglob("*.tsx"):
                self.signatures["ui_components"].add(f.name)
                self.signatures["ui_components"].add(f.stem)

        # 3. Scan Workers
        worker_dir = self.root_dir / "platform/worker/handlers"
        if worker_dir.exists():
            for f in worker_dir.glob("*.py"):
                self.signatures["worker_handlers"].add(f.stem)

        # 4. Scan Pages (App Router)
        pages_dir = self.root_dir / "platform/client/src/app"
        if pages_dir.exists():
            for f in pages_dir.rglob("page.tsx"):
                # Extract the route from path
                rel = f.relative_to(pages_dir)
                route = "/" + str(rel.parent).replace("\\", "/")
                if route == "/.": route = "/"
                self.signatures["pages"].add(route)

    def match_task(self, task_title: str) -> Dict[str, Any]:
        """
        Heuristic matching engine to determine implementation status.
        """
        title_lower = task_title.lower()
        evidence = []
        status = "missing"
        
        # Rule 1: Component Match
        # Example: "Button.tsx" or "StatCard"
        for comp in self.signatures["ui_components"]:
            if comp.lower() in title_lower:
                evidence.append(f"Component: {comp}")
                status = "done"

        # Rule 2: API Route Match
        # Example: "/auth/login" or "login endpoint"
        for route in self.signatures["api_routes"]:
            # Check if route parts are in title
            parts = [p for p in route.split("/") if p]
            if any(p in title_lower for p in parts if len(p) > 3):
                evidence.append(f"API Route: {route}")
                status = "done"

        # Rule 3: Page Match
        # Example: "Login page"
        for page in self.signatures["pages"]:
            page_name = page.split("/")[-1] or "dashboard"
            if page_name in title_lower and "page" in title_lower:
                evidence.append(f"App Page: {page}")
                status = "done"

        # Rule 4: Worker Match
        for worker in self.signatures["worker_handlers"]:
            # example: "email handler" -> email_handler
            w_norm = worker.replace("_", " ")
            if w_norm in title_lower:
                evidence.append(f"Worker: {worker}")
                status = "done"

        # Special keywords for "Partial" detection
        if status == "missing":
            partial_keywords = ["plan", "design", "refactor", "cleanup"]
            if any(k in title_lower for k in partial_keywords):
                status = "partial"

        return {
            "status": status,
            "evidence": evidence,
            "source": "code" if evidence else "plan"
        }

class PlanParser:
    """
    Parses the phase plan and extracts structured intent.
    """
    def __init__(self, md_path: Path):
        self.md_path = md_path

    def parse(self) -> List[Dict[str, Any]]:
        if not self.md_path.exists(): return []
        content = self.md_path.read_text()
        
        phases = []
        # Split by ## Phase
        phase_blocks = re.split(r'\n##\s+', content)
        
        for block in phase_blocks:
            if not block.strip().lower().startswith("phase"): continue
            
            lines = block.strip().split('\n')
            header = lines[0]
            # Clean title: "Phase 1 - Foundation" -> "Phase 1"
            phase_match = re.search(r'Phase\s+([\d\.]+)', header, re.I)
            if not phase_match: continue
            
            phase_num = phase_match.group(1)
            phase_name = header.strip()
            
            phase = {
                "id": phase_num,
                "name": phase_name,
                "tasks": [],
                "implemented_hints": [],
                "discovered": []
            }
            
            current_section = "General"
            for line in lines[1:]:
                line = line.strip()
                if not line: continue
                
                # Detect Section
                if line.startswith("**[") and line.endswith("]**"):
                    current_section = line[3:-3]
                    continue
                
                # Detect Implementation Snapshot
                if "Implemented foundation" in line or "Implemented includes" in line:
                    phase["implemented_hints"].append(line)
                    continue

                # Detect Tasks
                task_match = re.search(r'^-\s+(?:\[([ xX])\]\s+)?(.*)', line)
                if task_match:
                    manual_checked = task_match.group(1) and task_match.group(1).lower() == 'x'
                    task_text = task_match.group(2).strip()
                    if not task_text: continue
                    
                    phase["tasks"].append({
                        "title": task_text,
                        "category": current_section,
                        "manual_done": manual_checked
                    })
            
            phases.append(phase)
        return phases

def reconcile_system(root_dir: Path):
    intel = CodebaseIntelligence(root_dir)
    parser = PlanParser(root_dir / "docs/plan/phase_wise_plan.md")
    raw_phases = parser.parse()
    
    final_phases = []
    for p in raw_phases:
        processed_tasks = []
        for t in p["tasks"]:
            analysis = intel.match_task(t["title"])
            
            # Final status logic
            is_done = t["manual_done"] or analysis["status"] == "done"
            status = "done" if is_done else analysis["status"]
            
            processed_tasks.append({
                "title": t["title"],
                "category": t["category"],
                "completed": is_done,
                "status": status,
                "evidence": analysis["evidence"],
                "source": "both" if (t["manual_done"] and analysis["evidence"]) else ("code" if analysis["evidence"] else "plan")
            })
        
        # Calculate progress
        done_count = sum(1 for t in processed_tasks if t["completed"])
        total_count = len(processed_tasks)
        progress = round((done_count / total_count * 100)) if total_count > 0 else 0
        
        final_phases.append({
            "id": p["id"],
            "name": p["name"],
            "progress": progress,
            "tasks": processed_tasks,
            "stats": {
                "total": total_count,
                "done": done_count,
                "missing": sum(1 for t in processed_tasks if t["status"] == "missing")
            }
        })
    
    return final_phases

if __name__ == "__main__":
    import json
    data = reconcile_system(Path("."))
    print(json.dumps(data, indent=2))
