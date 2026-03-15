# Phase 2 Technical Audit - Contacts Engine

> Audit basis: code verification
> Audit date: March 15, 2026
> Scope: backend routes, services, worker, migrations, and contacts frontend
> Verdict: Functional and production-usable, but documentation and checklist status are materially overstated

## Executive Verdict

Phase 2 is implemented as a real contacts subsystem. The platform can already import, validate, deduplicate, store, browse, batch-track, suppress, tag, delete, and export contacts.

The major problem is not lack of implementation. The major problem is mismatch:

- docs still describe an older synchronous import architecture
- checklist items mark several features complete that do not exist in code
- schema documentation does not reflect the actual active data path
- frontend functionality is ahead of the docs in some areas and behind the docs in others

The correct status is:

- core contacts engine: implemented
- import pipeline: implemented, now async
- operational completeness against original Phase 2 promise: partial

## Audit Scope

Code paths reviewed:

- `platform/api/routes/contacts.py`
- `platform/api/services/contact_service.py`
- `platform/api/services/batch_service.py`
- `platform/api/utils/file_parser.py`
- `platform/api/utils/rabbitmq_client.py`
- `platform/worker/background_worker.py`
- `platform/database/migrations/003_contacts_module_phase2.sql`
- `platform/client/src/app/contacts/page.tsx`
- `platform/client/src/app/contacts/[id]/page.tsx`
- `platform/client/src/app/contacts/suppression/page.tsx`
- `platform/client/src/app/contacts/batch/[batchId]/page.tsx`

## Current Technical Architecture

### API layer

FastAPI exposes the contacts module under `/contacts`.

Main verified routes:

- `GET /contacts/stats`
- `GET /contacts/`
- `GET /contacts/domains`
- `POST /contacts/upload/preview`
- `POST /contacts/upload/import`
- `GET /contacts/jobs/{job_id}`
- `POST /contacts/bulk-delete`
- `DELETE /contacts/all`
- `GET /contacts/batches`
- `DELETE /contacts/batch/{batch_id}`
- `POST /contacts/resolve-error`
- `GET /contacts/{contact_id}`
- `PATCH /contacts/{contact_id}`
- `POST /contacts/{contact_id}/tags`
- `GET /contacts/suppression`
- `GET /contacts/export`
- `DELETE /contacts/{contact_id}`

### Service layer

`ContactService` is the business-logic core. It currently owns:

- email validation
- plan-limit enforcement
- batch deduplication
- paginated listing
- domain normalization and domain-summary logic
- batch upsert
- bulk delete
- delete all
- subscribable-contact selection for campaigns
- tags update
- contact update
- suppression query
- export generation

`BatchService` owns:

- import batch creation
- batch listing
- batch deletion

### Async processing layer

The import path is split between:

- API route creating a job and queue message
- RabbitMQ exchange and queue for background tasks
- background worker consuming and processing imports
- `jobs` table used for polling and progress state

This is the active runtime architecture. Any document still describing imports as only request-response work is outdated.

## Verified Backend Logic

## 1. Preview and parsing

The preview route enforces a 2 MB max size and calls `parse_file`.

`parse_file` behavior:

- accepts only `.csv` and `.xlsx`
- CSV uses `pandas.read_csv`
- XLSX uses `pandas.read_excel` with `openpyxl`
- top blank rows in XLSX are removed
- first non-empty row becomes headers
- fully empty rows are removed
- column names are trimmed
- empty result sets return HTTP 400

This is a solid parser for small-to-medium imports. It is intentionally conservative and rejects unsupported formats instead of trying to infer them.

## 2. Import route behavior

The import route:

- parses custom field mapping JSON
- reads and validates the file
- transforms each row into a normalized contact object
- lowercases email values
- attaches custom fields when mapped
- skips fully blank rows before job creation
- creates a job row
- creates an import batch row
- publishes a background task
- returns immediately

This route no longer inserts contacts directly.

## 3. Worker behavior

`background_worker.py` processes import tasks with these mechanics:

- job status set to `processing`
- input contacts processed in chunks of 50
- each chunk passed into `ContactService.bulk_upsert`
- job progress written back after each chunk
- final job and batch status updated at completion

This design gives a good user-facing progress signal without blocking the API process.

### Important operational implication

Because each chunk goes through `bulk_upsert` independently, the worker does not enforce import-level atomicity.

Example:

1. Tenant has room for 80 new contacts.
2. User uploads 200 new contacts.
3. First chunk of 50 succeeds.
4. Second chunk of 30 may succeed.
5. Later chunks fail once the limit is hit.

Result:

- partial import
- not full rollback
- batch marked with mixed success/failure

If the intended product rule is "reject the entire import when it exceeds limit," current behavior does not satisfy that requirement.

## 4. Validation logic

`validate_email` uses a standard regex:

- valid enough for application screening
- not full RFC validation
- acceptable for this phase

Invalid rows are preserved as structured error objects rather than silently dropped.

Blank rows are handled differently:

- a row with no email and no mapped custom-field values is skipped
- skipped blank rows are not counted as failed contacts
- the route returns `skipped_blank` metadata for the frontend summary

Captured error fields include:

- row
- email
- first_name
- last_name
- reason

This gives the frontend enough data to support row-level recovery.

## 5. Deduplication logic

Two layers exist:

### In-memory upload deduplication

- uses a Python `set()`
- keeps the first occurrence of a repeated email in the same upload

### Database-level deduplication

- uses Supabase upsert with `on_conflict="tenant_id,email"`
- existing tenant/email pairs become updates
- new tenant/email pairs become inserts

This is the correct basic strategy for Phase 2.

## 6. Plan-limit logic

`check_plan_limits`:

- counts current tenant contacts
- resolves `max_contacts` via `tenants -> plans`
- falls back to `500` if relation data is missing

`_count_existing_emails`:

- checks existing emails in groups of 100
- avoids large `IN` payload problems

`bulk_upsert`:

- computes `new_count = unique_contacts - existing_count`
- only new contacts count against the quota

This is one of the stronger pieces of the Phase 2 implementation. It avoids the common mistake of charging quota for updates or re-imports.

## 7. List and search behavior

`get_contacts` supports:

- pagination
- optional `batch_id`
- optional multi-domain filtering
- search across:
  - `email`
  - `first_name`
  - `last_name`

It does not support:

- tag search
- rules-based segments
- field/operator/value segment composition

So current docs must describe this as contact search, not segmentation.

## 8. Domain-aware filtering and audience logic

Verified implemented:

- `email_domain` extraction during import and contact updates
- `/contacts/domains` summary endpoint
- batch-scoped domain summaries
- suspicious typo-domain suggestions using close-match logic
- campaign audience targets for:
  - `domain:...`
  - `domains:...`
  - `batch_domain:batch:domain`
  - `batch_domains:batch:domain1,domain2`

This is an implemented audience-filtering layer, but it is still not a generic segment builder.

## 9. Status and suppression behavior

`get_subscribable_contacts` returns only:

- `status = subscribed`

`get_suppression_list` returns:

- `bounced`
- `unsubscribed`
- `complained`

This aligns Phase 2 data with later send-exclusion behavior in delivery and campaign phases.

## 10. Export behavior

`export_contacts`:

- fetches all tenant contacts
- dynamically discovers all custom field keys across the result set
- writes CSV headers including built-in and custom fields
- serializes tags as comma-separated text

This is a practical export implementation and more capable than the older docs imply.

## 11. Batch history and failure recovery

Batch history is implemented through `import_batches`.

Stored fields include:

- `id`
- `file_name`
- `total_rows`
- `imported_count`
- `failed_count`
- `errors`
- `status`
- `created_at`

`resolve-error` allows manual correction and insertion of a failed row.

Current limitations:

- it assumes the corrected row costs one new contact
- it does not distinguish update-vs-insert before applying the limit check
- error removal is index-based, which is workable but brittle if concurrent edits ever appear

## Verified Frontend Logic

## 1. Contacts page

The contacts page is feature-rich and does more than the old docs document.

Verified features:

- stats summary
- usage-progress bar
- warning banners at high usage
- contacts list
- search
- dynamic custom-field columns
- selection and bulk delete
- delete all
- upload modal
- preview before import
- import history tab
- batch expansion and failed-row visibility
- async job polling
- CSV export
- compact batch/domain filtering on the main contacts page

The contacts page is also still heavily inline styled and not yet aligned with the shared Phase 0 component strategy.

## 2. Contact detail page

Verified features:

- single-contact fetch
- name, email, created date, and status display
- custom fields display
- tag editing
- contact editing for email and custom fields

Missing relative to earlier Phase 2 wording:

- no activity log
- no event timeline
- no campaign interaction feed

## 3. Suppression page

Verified features:

- paginated suppressed-contact list
- reason/status badge
- refresh button

## 4. Batch detail page

Verified features:

- per-batch contact listing
- search within batch
- pagination
- domain breakdown inside a batch
- multi-domain filtering inside the batch
- typo-domain warning banner when suspicious domains are detected

Technical issue:

- this page uses `http://127.0.0.1:8000` while the main contacts pages use `http://localhost:8000`

That is not a production-safe configuration pattern.

## Schema and Migration Truth

## What the migration says

`003_contacts_module_phase2.sql` adds:

- `tenant_id`
- `first_name`
- `last_name`
- `contact_custom_fields` table
- contact indexes
- RLS on `contact_custom_fields`

The current top-level migration chain now also includes:

- `019_phase2_contacts_alignment.sql`
- `020_contacts_email_domain.sql`
- `manual_apply_latest_runtime_sync.sql`

## What the active code uses

Active code stores custom fields on:

- `contacts.custom_fields`

not in:

- `contact_custom_fields`

That means the migration and the runtime model diverged. The audit must treat `contact_custom_fields` as an unused or legacy path until code actually reads and writes it.

It also means the runtime now depends on newer schema fields that were not present in the older top-level migration sequence until the latest alignment work:

- `import_batches`
- `contacts.import_batch_id`
- `contacts.custom_fields`
- `contacts.tags`
- `contacts.email_domain`

## Multi-Tenant and Security Audit

Current safety characteristics:

- tenant identity derived from auth middleware
- queries scoped by `tenant_id`
- service-role database access used from backend

This is acceptable only because the application code consistently applies tenant filters.

What should not be claimed:

- "RLS is the active contacts protection model"

There is no evidence in the current running contacts flow that database RLS is the primary enforcement layer for contacts data access.

## Documentation Mismatches That Needed Correction

The previous Phase 2 docs and trackers incorrectly or incompletely stated:

- imports are synchronous end-to-end
- segmentation filters are complete
- search includes tags
- tags have full CRUD API coverage
- soft delete with `deleted_at` exists
- contact detail page includes activity history
- Phase 2 is fully done

These claims are not supported by the code that was reviewed.

## Key Findings

## Finding 1 - Async import design is real and should be documented as such

The import route now creates `jobs` and pushes work to RabbitMQ. Any Phase 2 doc still describing a request-only import pipeline is outdated.

Impact:

- architecture diagrams are currently misleading
- future maintainers can misunderstand failure semantics and debugging paths

## Finding 2 - Imports are not atomic at file level

The background worker imports in chunks of 50 and each chunk independently checks limits and upserts.

## Finding 3 - Domain filtering is implemented, but only as targeted audience logic

The current code supports domain-based filtering and campaign audience narrowing, including multi-domain selection inside a batch. That is a real feature and should not be omitted from the docs.

What should still not be claimed:

- full generic segment builder
- tag-aware search
- field/operator/value audience composition

## Finding 4 - Contact detail page is no longer read-only

The current detail page supports editing email and custom fields through `PATCH /contacts/{id}`. Any docs that still describe the page as read-only are stale.

Impact:

- partial imports are possible
- quota behavior differs from an all-or-nothing expectation
- support and UI messaging should account for mixed outcomes

## Finding 3 - Segmentation is overstated

Backend listing supports only simple search and batch filtering. There is no real segment builder on the backend.

Impact:

- product docs over-promise
- downstream campaign-audience docs can become misleading

## Finding 4 - Soft delete is not implemented

No verified `deleted_at` contact flow, restore path, or retention window was found in the active Phase 2 code.

Impact:

- compliance and recovery expectations are inaccurate
- the phase tracker currently marks a non-existent feature as done

## Finding 5 - Custom field architecture is misdocumented

The migration introduces `contact_custom_fields`, but the actual import and list flow use `contacts.custom_fields`.

Impact:

- schema docs are misleading
- new developers can implement against the wrong model

## Finding 6 - Frontend infrastructure still has environment hardcoding

Contacts pages use hardcoded localhost URLs, and one page uses `127.0.0.1` instead of `localhost`.

Impact:

- brittle deployment behavior
- duplicated config logic

## Finding 7 - Contacts UI is functionally rich but not design-system aligned

The module relies on large page-level inline style blocks rather than shared components from Phase 0.

Impact:

- inconsistent UX
- slower maintenance
- harder refactoring

## Recommendations

### Immediate

1. Rewrite all Phase 2 docs and trackers to match the async queue-backed architecture.
2. Change the phase status from "done" to "implemented with gaps" or equivalent.
3. Remove soft-delete and segmentation completion claims from trackers.
4. Move API base configuration into shared environment-driven frontend config.

### Short-term

1. Decide whether imports should be atomic or partial.
2. If atomic, move limit evaluation to pre-flight whole-file logic before queueing or use transactional worker logic.
3. If partial is acceptable, expose clearer batch-result semantics in UI and docs.
4. Consolidate the custom-fields model and deprecate unused schema paths.

### Medium-term

1. Implement real segmentation if the roadmap still requires it.
2. Add activity history only when analytics/event tables are wired to the contact detail page.
3. Refactor the contacts UI to shared Phase 0 components.
4. Remove or quarantine legacy contacts code paths that still use older `project_id` assumptions.

## Final Assessment

Phase 2 is one of the more substantial implemented areas of the product. The code proves there is a working contacts engine, and it already supports the core workflows the product needs to proceed into campaigns and delivery.

But it is not accurate to call the phase fully complete. The truthful status is:

- foundation and operational flows: present
- architecture: modernized beyond old docs
- product promises in docs/checklists: ahead of reality in several places

The right maintenance action is not to rewrite the code first. It is to align the documentation to the current code, then decide which missing product promises still belong in Phase 2 versus a later cleanup phase.
