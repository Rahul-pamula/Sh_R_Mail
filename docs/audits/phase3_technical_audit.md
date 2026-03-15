# Phase 3 Technical Audit - Template Engine

> Audit basis: code verification
> Audit date: March 15, 2026
> Scope: backend routes, services, compile path, migrations, and templates frontend
> Verdict: Functional template subsystem with a real active editor, but documentation and checklist status were materially inaccurate

## Executive Verdict

Phase 3 is implemented as a real template-authoring subsystem. The platform can already create templates, load preset starter designs, edit templates in a structured block editor, compile previews on the backend, list templates, and delete templates.

The major issue is not lack of a template engine. The issue is drift:

- the previous Phase 3 audit was about contacts, not templates
- docs still describe GrapesJS as the active editor when the block editor is now the main path
- the checklist marks or implies completion for features that are not backed by routes or runtime behavior
- `compiled_html` storage exists, but the active editor does not keep it synchronized on save

The correct status is:

- core template engine: implemented
- active editor path: structured block editor
- completeness against the original Phase 3 promise: partial

## Audit Scope

Code paths reviewed:

- `platform/api/routes/templates.py`
- `platform/api/services/template_service.py`
- `platform/api/services/compile_service.py`
- `platform/api/models/template.py`
- `platform/client/src/app/templates/page.tsx`
- `platform/client/src/app/templates/new/page.tsx`
- `platform/client/src/app/templates/[id]/page.tsx`
- `platform/client/src/app/templates/[id]/editor/page.tsx`
- `platform/client/src/app/templates/[id]/block/page.tsx`
- `platform/client/src/app/templates/[id]/builder/page.tsx`
- `platform/client/src/components/GrapesJSEditor.tsx`
- `migrations/003_create_templates_table.sql`
- `migrations/004_add_mjml_source.sql`

## Current Technical Architecture

### API layer

FastAPI exposes the templates module under `/templates`.

Verified routes:

- `POST /templates/`
- `GET /templates/`
- `GET /templates/{template_id}`
- `PUT /templates/{template_id}`
- `DELETE /templates/{template_id}`
- `POST /templates/compile/preview`

Notably absent:

- `POST /templates/{template_id}/duplicate`
- version-history routes
- test-send route
- public view-online route

### Service layer

`TemplateService` is the persistence layer. It currently owns:

- template creation
- paginated listing
- fetch by id
- update
- delete
- compatibility unpacking of `design_json` from `mjml_json`

Important implementation detail:

- `design_json` is stored inside `mjml_json.design_json`
- this is an application-side compatibility choice to avoid a dedicated schema migration
- the API then rehydrates `design_json` into the response

### Compile layer

`compile_service.py` is the actual rendering core.

Pipeline:

1. `render_block()`
2. `render_column()`
3. `render_row()`
4. `render_design()`
5. `compile_mjml_to_html()`

Technical stack:

- Python recursive renderers generate MJML snippets
- MJML CLI is executed through `subprocess.run(["npx", "-y", "mjml", ...])`
- compiled HTML is returned to the caller

This is the correct high-level architecture for email safety because the backend, not the browser, owns final render generation.

### Frontend layer

The frontend currently has three template-editing eras in the same codebase:

1. Active block editor
   - `/templates/[id]/block`
2. Redirect shims
   - `/templates/[id]`
   - `/templates/[id]/editor`
3. Legacy GrapesJS builder
   - `/templates/[id]/builder`

The intended primary editor is clearly the block editor. The redirect routes confirm that direction.

## Verified Backend Logic

## 1. Template creation

Create requests accept structured payloads through `TemplateCreate`.

Stored fields include:

- `name`
- `subject`
- `category`
- `compiled_html`
- `plain_text`
- `template_type`
- `schema_version`
- `design_json`

But storage is slightly non-obvious:

- `design_json` is nested into `mjml_json`
- `mjml_source` is set to an empty string
- `compiled_html` defaults to `<p>Loading…</p>` if not supplied
- `version` is initialized to `1`

This means the schema supports multiple storage styles, but the active product flow is structured-editor-first.

## 2. Template listing

`TemplateService.list_templates()`:

- paginates with range offsets
- orders by `updated_at desc`
- filters by `tenant_id`
- returns total count

The frontend then applies an additional client-side search over:

- `name`
- `subject`

There is no backend search or category-filter route currently exposed.

## 3. Structured editor behavior

The block editor keeps the working design in client state and supports:

- row preset insertion
- block insertion
- block drag-and-drop
- row drag-and-drop
- content/style editing
- undo/redo history in memory
- desktop/mobile preview mode

This is a substantial implementation and should be recognized as the real Phase 3 editor.

## 4. Compile preview behavior

The preview path is:

- frontend calls `POST /templates/compile/preview`
- backend calls `compile_design_json()`
- backend returns raw HTML
- frontend opens preview from returned HTML

This is a compile-preview path only.

It does not:

- persist compiled HTML
- write preview versions
- expose preflight warnings

## 5. Save behavior

This is the most important current technical gap.

The block editor save request sends:

- `name`
- `subject`
- `design_json`
- `template_type`
- `schema_version`

It does not send:

- `compiled_html`
- `plain_text`

`TemplateService.update_template()` only updates `compiled_html` if it is included in the request.

Operational consequence:

- the active editor can preview current compiled output
- the active editor does not persist compiled output on save
- `compiled_html` may remain stale or placeholder content

So any checklist item claiming "store compiled HTML" is only partially true in the active user flow.

## 6. Preflight logic exists but is not wired

`compile_service.py` includes `run_preflight_checks()` with logic for:

- Gmail clipping threshold warnings
- unsubscribe-link presence
- all-caps ratio
- spam-trigger words

This is valuable logic, but it is not currently exposed through the preview route or shown in the UI.

That means some deliverability-aware engineering exists in code, but it is not yet productized.

## Verified Frontend Logic

## 1. Templates list page

The list page supports:

- template fetch
- pagination
- client-side search by name/subject
- preset gallery
- delete action
- click-through editing

It also includes a duplicate action, but that flow is broken because the backend endpoint does not exist.

## 2. New-template route

`/templates/new` creates a starter structured design and redirects into the block editor.

This is the blank-canvas flow and is working.

## 3. Route normalization

`/templates/[id]` and `/templates/[id]/editor` both redirect to `/templates/[id]/block`.

That is a good sign of architectural consolidation even though legacy code remains.

## 4. Legacy builder drift

There is still a real GrapesJS builder page in the repo, and it includes:

- GrapesJS initialization
- newsletter preset
- Supabase storage upload support
- HTML/CSS save flow

But the generic `GrapesJSEditor.tsx` component is now only a stub, and the routing layer points users toward the block editor.

So Phase 3 should be documented as:

- block editor = active path
- GrapesJS builder = legacy/secondary drift still present in code

not as:

- GrapesJS builder = completed primary editor

## Technical Debt and Verified Gaps

### 1. Previous audit was wrong-phase content

The prior `phase3_technical_audit.md` documented contacts, not templates. That made the Phase 3 status materially misleading.

### 2. Frontend-backend contract mismatch for duplicate

The list page calls:

- `POST /templates/{id}/duplicate`

No matching backend route exists.

### 3. Hardcoded API base URLs

The templates frontend mixes:

- `http://127.0.0.1:8000`
- `http://localhost:8000`
- `NEXT_PUBLIC_API_URL || "http://localhost:8000"`

This is a real deployment/configuration risk and should be normalized.

### 4. `design_json` storage is a compatibility shortcut

Storing `design_json` inside `mjml_json` works, but it blurs the schema:

- `mjml_json` no longer means strictly MJML JSON
- persistence logic depends on application-side unpacking

This is acceptable short term, but it should be documented honestly and eventually normalized.

### 5. Compiled HTML persistence is incomplete

Schema support is present, but the active editor does not keep `compiled_html` current on save.

### 6. Versioning is absent

The `version` field exists, but there is no actual version-history subsystem:

- no version snapshots
- no restore flow
- no audit trail for template revisions

### 7. Plain text is not a full product flow

`plain_text` exists in the model and service, but:

- there is no verified auto-generation save path
- there is no current editor UI for custom plain text

## Schema and Migration Review

Relevant migrations:

- `003_create_templates_table.sql`
- `004_add_mjml_source.sql`

The schema supports:

- template storage
- MJML source
- compiled HTML
- version column

But the runtime product has moved toward a structured `design_json` editor layered on top of that original schema.

That is why the implementation uses compatibility packing into `mjml_json`.

## Final Verdict

Phase 3 is not missing. It is real and already useful.

But the correct technical statement is:

- template CRUD: implemented
- preset-driven structured editing: implemented
- backend compile preview: implemented
- active editor architecture: block editor
- complete versioned template platform: not implemented yet

So the right conclusion is:

**Phase 3 is partially complete and operational, not fully complete.**
