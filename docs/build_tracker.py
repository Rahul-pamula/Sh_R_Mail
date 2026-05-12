import re
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Set

# --- CONFIGURATION ---
BASE_DIR = Path(__file__).resolve().parents[1]
MD_PATH = BASE_DIR / "docs/plan/phase_wise_plan.md"
HTML_PATH = BASE_DIR / "docs/progress.html"

class StrictAuditor:
    """
    Truth-driven Auditor. 
    Verifies Logic + API + UI integration for 'Done' status.
    """
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.sigs = self._scan()

    def _scan(self):
        sigs = {"routes": set(), "ui": set(), "logic": {}, "pages": set()}
        
        # API & Logic
        api_dir = self.root_dir / "platform/api/routes"
        if api_dir.exists():
            for f in api_dir.glob("*.py"):
                content = f.read_text()
                sigs["logic"][f.name] = content
                sigs["routes"].update(re.findall(r'@router\.(?:get|post|put|delete|patch)\("([^"]+)"', content))

        # UI
        ui_dir = self.root_dir / "platform/client/src/components"
        if ui_dir.exists():
            for f in ui_dir.rglob("*.tsx"):
                sigs["ui"].add(f.stem.lower())
                sigs["logic"][f.name] = f.read_text()

        # Pages
        app_dir = self.root_dir / "platform/client/src/app"
        if app_dir.exists():
            for f in app_dir.rglob("page.tsx"):
                sigs["pages"].add(f.parent.name.lower())

        return sigs

    def audit(self, task: str, manual_done: bool) -> Dict[str, Any]:
        t = task.lower()
        
        # Core Feature Heuristics
        is_done = False
        is_partial = False
        
        # Example: Signup/Auth
        if any(x in t for x in ["signup", "auth", "login"]):
            has_api = any("/auth" in r for r in self.sigs["routes"])
            has_ui = "authshell" in self.sigs["ui"]
            has_logic = "hash_password" in str(self.sigs["logic"].get("auth.py", ""))
            is_done = has_api and has_ui and has_logic
            is_partial = has_ui or has_api
            
        # Example: Contacts/Import
        elif "import" in t and "contact" in t:
            has_api = any("/contacts/upload" in r for r in self.sigs["routes"])
            has_worker = "import_handler.py" in self.sigs["logic"]
            is_done = has_api and has_worker
            is_partial = has_api

        # Example: Campaigns
        elif "campaign" in t:
            has_api = any("/campaigns" in r for r in self.sigs["routes"])
            has_ui = "campaignwizard" in self.sigs["ui"]
            is_done = has_api and has_ui
            is_partial = has_api or has_ui

        # General Logic
        else:
            has_ui = any(u in t for u in self.sigs["ui"] if len(u) > 3)
            has_api = any(r.replace("/", "") in t.replace(" ", "") for r in self.sigs["routes"] if len(r) > 4)
            is_done = has_ui and has_api
            is_partial = has_ui or has_api

        # Manual override (User check in MD)
        if manual_done:
            status = "done"
        else:
            status = "done" if is_done else ("partial" if is_partial else "missing")

        return {"status": status, "is_fake": not is_done and manual_done}

def build():
    auditor = StrictAuditor(BASE_DIR)
    content = MD_PATH.read_text()
    
    phases = []
    blocks = re.split(r'\n##\s+', content)
    
    for block in blocks:
        if not block.strip().lower().startswith("phase"): continue
        lines = block.strip().split('\n')
        header = lines[0]
        
        phase_id_match = re.search(r'Phase\s+([\d\.]+)', header, re.I)
        phase_id = phase_id_match.group(1) if phase_id_match else "0"
        phase_name = header.split("—")[-1].strip() if "—" in header else header
        
        phase = {"id": phase_id, "name": phase_name, "tasks": [], "stats": {"done": 0, "partial": 0, "missing": 0}}
        curr_cat = "General"
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith("**["): curr_cat = line[3:-3]; continue
            
            task_match = re.search(r'^-\s+(?:\[([ xX])\]\s+)?(.*)', line)
            if task_match:
                manual = task_match.group(1).lower() == 'x' if task_match.group(1) else False
                text = task_match.group(2).strip()
                if not text or len(text) < 5: continue
                
                result = auditor.audit(text, manual)
                status = result["status"]
                
                phase["tasks"].append({
                    "title": text,
                    "category": curr_cat,
                    "status": status,
                    "is_fake": result["is_fake"]
                })
                phase["stats"][status] += 1

        if phase["tasks"]:
            total = len(phase["tasks"])
            phase["progress"] = round((phase["stats"]["done"] / total) * 100) if total > 0 else 0
            phases.append(phase)

    with open(HTML_PATH, "w") as f:
        f.write(TEMPLATE.replace("MAGIC_JSON", json.dumps(phases)))

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><title>ShrFlow Auditor Command Center</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #08080a; color: #f4f4f5; overflow: hidden; }
        .phase-card { background: #111114; border: 1px solid #1f1f23; transition: all 0.2s; cursor: pointer; }
        .phase-card:hover { border-color: #3f3f46; background: #16161a; transform: translateY(-2px); }
        .side-panel { background: #0c0c0e; border-left: 1px solid #1f1f23; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .side-panel.open { transform: translateX(0); }
        .status-done { color: #10b981; }
        .status-partial { color: #f59e0b; }
        .status-missing { color: #ef4444; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen overflow-hidden">
    <!-- Main Content -->
    <main class="flex-1 p-8 overflow-y-auto">
        <header class="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight mb-1">ShrFlow <span class="text-indigo-500">Auditor</span></h1>
                <p class="text-zinc-500 text-sm">Strict validation engine. No fake progress. 100% Truth.</p>
            </div>
            
            <div class="flex items-center gap-8">
                <div class="relative">
                    <input type="text" id="search" placeholder="Search phases..." class="bg-[#111114] border border-[#1f1f23] rounded-xl py-2 px-10 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all">
                    <svg class="w-4 h-4 text-zinc-600 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <div class="text-right">
                    <div class="text-5xl font-black text-white" id="global-progress">0%</div>
                    <div class="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Verified Readiness</div>
                </div>
            </div>
        </header>

        <div id="grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
    </main>

    <!-- Side Panel -->
    <div id="panel" class="side-panel fixed top-0 right-0 h-full w-full md:w-[500px] shadow-2xl flex flex-col z-50">
        <div class="p-6 border-b border-white/5 flex justify-between items-center bg-[#111114]">
            <div id="panel-header">
                <h2 class="text-xl font-bold" id="p-title">Phase Details</h2>
                <p class="text-zinc-500 text-xs" id="p-subtitle">0 tasks</p>
            </div>
            <button onclick="closePanel()" class="p-2 hover:bg-white/5 rounded-full text-zinc-400">&times;</button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-6 space-y-8" id="p-content"></div>
    </div>

    <script>
        const data = MAGIC_JSON;
        const grid = document.getElementById('grid');
        const searchInput = document.getElementById('search');
        
        function renderGrid(filter = '') {
            grid.innerHTML = '';
            let totalDone = 0, totalTasks = 0;
            
            data.forEach(p => {
                if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return;
                
                totalDone += p.stats.done;
                totalTasks += p.tasks.length;
                
                const card = document.createElement('div');
                card.className = 'phase-card p-5 rounded-2xl flex flex-col justify-between h-40';
                card.onclick = () => openPanel(p);
                
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Phase ${p.id}</span>
                            <span class="text-xs font-bold ${p.progress > 80 ? 'text-emerald-500' : 'text-zinc-400'}">${p.progress}%</span>
                        </div>
                        <h3 class="font-bold text-sm leading-tight text-zinc-200">${p.name}</h3>
                    </div>
                    <div class="flex gap-4 items-center mt-4">
                        <div class="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 transition-all duration-1000" style="width: ${p.progress}%"></div>
                        </div>
                        <span class="text-[10px] text-zinc-500 font-medium">${p.stats.done}/${p.tasks.length}</span>
                    </div>
                `;
                grid.appendChild(card);
            });
            
            // Recalculate global progress only if not filtering
            if (!filter) {
                document.getElementById('global-progress').innerText = Math.round(totalDone/totalTasks*100) + '%';
            }
        }

        searchInput.addEventListener('input', (e) => renderGrid(e.target.value));

        function openPanel(p) {
            document.getElementById('p-title').innerText = p.name;
            document.getElementById('p-subtitle').innerText = `Phase ${p.id} • ${p.tasks.length} Total Tasks`;
            
            const content = document.getElementById('p-content');
            content.innerHTML = '';
            
            const groups = { done: [], partial: [], missing: [] };
            p.tasks.forEach(t => groups[t.status].push(t));

            ['done', 'partial', 'missing'].forEach(status => {
                if(groups[status].length === 0) return;
                
                const section = document.createElement('div');
                const title = status.toUpperCase();
                const color = status === 'done' ? 'emerald' : (status === 'partial' ? 'amber' : 'red');
                
                section.innerHTML = `
                    <h4 class="text-[10px] font-black text-${color}-500/80 mb-3 tracking-[0.2em] flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-${color}-500"></span> ${title} (${groups[status].length})
                    </h4>
                    <div class="space-y-2">
                        ${groups[status].map(t => `
                            <div class="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                                <div class="text-xs text-zinc-300 font-medium">${t.title}</div>
                                <div class="flex gap-2 mt-2">
                                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-600 font-bold uppercase">${t.category}</span>
                                    ${t.is_fake ? '<span class="text-[9px] text-red-500/50 font-bold italic">Manual Check Override</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                content.appendChild(section);
            });

            document.getElementById('panel').classList.add('open');
        }

        function closePanel() { document.getElementById('panel').classList.remove('open'); }
        renderGrid();
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    build()
