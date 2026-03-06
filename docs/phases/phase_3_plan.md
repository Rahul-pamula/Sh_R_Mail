# Phase 3 Plan: Advanced Template Engine (Block Architecture + Canonical JSON)

## Goal
Build a production-stable, feature-rich template system where:
- Templates are edited as canonical block JSON (similar to specialized email tools, but specific to our constraints).
- The compiler generates email-safe HTML using an MJML bridge.
- Save/reload operations are exactly deterministic (no layout drift).
- Links, click tracking, social profiles, and legal compliance are first-class features.
- Advanced features like 1-click themes, client preview warnings, and spam score analysis are built-in native to the platform.

## Scope Freeze (Phase 3)
- **Primary Editor:** Visual Block Editor for reusable, polished templates.
- **Basic Editor:** Simple rich text editor remains for basic, personal-style campaigns.
- **Legacy Editor:** Raw HTML editing is supported but not the primary flow for new creations.

---

## 1) Architecture & Canonical JSON Schema

### Core Model
`Template -> Sections -> Blocks -> Elements -> Properties`

### Design Rules
- **JSON is the Source of Truth:** HTML is strictly an output, never parsed back into the editor.
- **1:1 Mapping:** Every editable property maps directly to an MJML attribute or a controlled transform.
- **Strict Units:** Use fixed units (`px`) for spacing/width to ensure cross-client compatibility.
- **Versioning:** Every saved template has a schema version (`schema_version: "1.0.0"`).

---

## 2) The Division of Capabilities

### 🛠 [BACKEND] API, Storage & Compilation
- **Template CRUD & Storage:**
  - Store `design_json` (source of truth) and `compiled_html` (output) in the `templates` table over Supabase POSTGRES.
- **Compilation Engine (`POST /v1/render/compile`):**
  - **Pipeline:** JSON → MJML Bridge → HTML.
  - **Link Transformation:** Append UTM parameters and tracking wrappers natively during compilation (not stored in JSON).
  - **Compliance Enforcement:** Automatically inject an unsubscribe link mechanism (`{{unsubscribe}}`) if the user forgot it.
- **Pre-flight Checks & Warnings System:**
  - **Spam Score Analysis:** Basic heuristic checks (e.g., text-to-image ratio, ALL CAPS flags) to warn users before sending.
  - **Client Rendering Warnings:** Alert users about unsupported CSS (e.g., rounded corners in Outlook).
- **Versioning (`template_versions`):**
  - Snapshot `design_json` on every manual save and every X seconds for auto-save.
  - Endpoint to restore a previous version.
- **Asset Management (`GET /v1/assets/sign-url`):**
  - Tenant-isolated media library using Supabase Storage.
  - Signed URLs for editor preview; permanent URLs generated at compile time.

### 💻 [FRONTEND] Editor UX & Interfaces
- **Visual Block Canvas:**
  - `iframe srcDoc` isolation to prevent the dashboard's CSS from leaking into the email template.
  - Click-to-select, drag-to-reorder for sections and blocks.
  - Integration with `react-moveable` for resizing handles where email-safe.
- **Properties Inspector (Right Panel):**
  - Contextual properties based on the selected element (e.g., Image -> URL, Alt text, Width; Button -> Link, Color, Radius).
- **Advanced Previews & Testing:**
  - **Split Desktop/Mobile Preview:** View both layouts simultaneously side-by-side.
  - **Test Email Modal:** Send a test compile to a specified email address instantly.
- **Theme Presets (1-Click Branding):**
  - Global `theme` object allowing instant swapping between "Dark Mode", "Minimal", "Corporate", etc.
- **Saved Blocks Library:**
  - Ability to save a customized "Hero" or "Footer" section to a tenant's personal block library and reuse it in other templates.

### 🔌 [INTEGRATIONS] & External Services
- **MJML (Markup Language):** Use the official MJML library (Node.js wrapper or Python equivalent) as the core rendering engine.
- **Supabase Storage:** Direct integration for tenant image uploads and signed URLs.
- **Tracking Endpoints (Internal):** Hooking the compiled template links into Phase 6's Open/Click tracking ecosystem.
- **Sanitization (Bleach / DOMPurify):** Strict adherence to security standards to prevent XSS.

---

## 3) Feature Deep Dives & Differentiators

### A) 1-Click Theme Presets
Instead of forcing users to build colors from scratch, provide preset theme configurations that instantly re-map the template's global variables (Backgrounds, Texts, Accents).
```json
"theme": {
  "active_preset": "dark_mode",
  "palette": {
    "bg": "#0B1020",
    "text": "#FFFFFF",
    "accent": "#7C3AED"
  }
}
```

### B) Intelligent Pre-send Warnings (Free alternative to Litmus)
Analyze the JSON schema before compilation:
- **Outlook Warnings:** Highlight if `border-radius` is used on a button.
- **Size Warnings:** Predict if the compiled HTML will exceed Gmail's `102KB` clipping limit.
- **Spam Warnings:** Flag common trigger words or high image-to-text ratios.

### C) Saved Blocks (Component Library)
Allow users to isolate a specific configured section (like a custom footer with their distinct social links and address) and save it to a `tenant_blocks` table to drag-and-drop into any future email.

---

## 4) MVP Rollout (6 Mini-Phases)

| Sub-Phase | Focus | Deliverables |
|-----------|-------|--------------|
| **3.1** | Canonical Core | JSON Schema (Pydantic/Zod), MJML Compiler API, DB Tables. |
| **3.2** | Canvas & Inspector | React iframe canvas, block selection, basic property editing. |
| **3.3** | Assets & Links | Tenant media uploads, signed URLs, UTM builder, and Link tracker wrapper. |
| **3.4** | Advanced UI | Theme Presets, Split Desktop/Mobile Preview, Saved Blocks system. |
| **3.5** | Pre-flight Checks | Unsubscribe enforcement, Client Rendering Warnings, Spam Score basic checks. |
| **3.6** | History & Polish | Auto-save, Version history, Undo/Redo (Immer), Production QA. |

---

## 5) Immediate Execution Priority (Your Current Goal)
1. **Ship the Engine Foundation:** Define exactly what the `design_json` schema looks like for Template 13 (The "Midnight Flash Sale" reference).
2. **Build the Backend Compiler:** Ensure the FastAPI backend can take that JSON, inject UTMs/trackers, and spit out perfect MJML -> HTML.
3. **Connect the Frontend Editor:** Allow the user to click the text and images in Template 13 and change them via the Inspector panel.

Once Template 13 is fully functional end-to-end, the architecture is validated, and we scale to remaining templates.
