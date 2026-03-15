# Phase 2 - Contacts Engine

> Verification status: Verified against code
> Last reviewed: March 15, 2026
> Overall status: Implemented and usable, but not fully complete against the original Phase 2 checklist

## Purpose

Phase 2 establishes the contact-management layer for the product. It is the phase where the platform moves from tenant and auth setup into actual audience data handling:

- import contacts from files
- validate and deduplicate records
- enforce tenant plan limits
- store contact profile data
- expose list, detail, suppression, batch-history, and export flows
- provide the contact base that later phases use for campaigns, analytics, and compliance

This phase is operational in code today. The main issue is not absence of a contacts system. The issue is that several docs still describe an older synchronous design and claim completion for items that are not actually implemented.

## What Phase 2 Actually Builds

The current codebase implements Phase 2 as a combined backend and frontend workflow:

1. A user uploads a CSV or XLSX file from the contacts page.
2. The API parses the file and returns a preview with detected headers.
3. The frontend maps the email column and optional custom fields.
4. The API creates a background job and an import batch record.
5. A RabbitMQ-backed worker processes the import asynchronously.
6. The worker validates emails, deduplicates, applies plan limits, and upserts contacts.
7. The frontend polls job status and then shows final import results.
8. Users can inspect imported contacts, review batch history, resolve some failed rows, delete records, update tags, view suppressed contacts, and export CSV data.

## Architecture

### Backend stack

- FastAPI routes under `platform/api/routes/contacts.py`
- Supabase/PostgreSQL accessed through the service-role client
- `pandas` and `openpyxl` for file parsing
- RabbitMQ for asynchronous import processing
- business logic in `ContactService`
- batch lifecycle management in `BatchService`
- background worker in `platform/worker/background_worker.py`

### Frontend stack

- Next.js app router pages under `platform/client/src/app/contacts`
- React client-side fetch flows with JWT bearer auth
- import preview, import execution, job polling, batch history, suppression page, and contact detail page implemented directly in page components

### Security model

The current tenant-isolation model is application enforced, not database enforced as a reliable primary layer.

- tenant identity comes from `require_active_tenant`
- queries are scoped with `.eq("tenant_id", tenant_id)`
- the backend uses the Supabase service-role client
- docs should not describe this phase as protected primarily by active RLS

## Real Import Flow

## Step 1 - Upload preview

`POST /contacts/upload/preview`

The preview route:

- reads the uploaded file
- enforces a 2 MB size limit
- parses CSV or XLSX
- returns `headers`, `preview`, and `row_count`

This is the first-stage validation flow used by the contacts UI before the import starts.

## Step 2 - File parsing

`platform/api/utils/file_parser.py`

What is actually supported:

- `.csv`
- `.xlsx`

What is not supported:

- `.xls`
- `.pdf`
- `.txt`

Parsing behavior:

- CSV uses `pandas.read_csv`
- XLSX uses `pandas.read_excel(..., engine="openpyxl", header=None)`
- blank top rows in Excel are removed
- the first non-empty row becomes the header row
- fully empty rows are dropped
- whitespace is stripped from column names
- empty parsed files return HTTP 400

## Step 3 - Field mapping

`POST /contacts/upload/import`

The route currently supports:

- `email_col`
- `first_name_col`
- `last_name_col`
- `custom_mappings` as JSON

The frontend currently auto-detects email-like columns and defaults all other columns to `skip`. Users can map skipped columns to `custom:<field_name>` targets.

Current product clarification:

- email is the only required field in the active flow
- the UI no longer depends on first-name and last-name mapping for a successful import
- custom fields are the primary way to capture additional columns

## Step 4 - Async job creation

The import route no longer performs the full insert inside the request cycle.

What it does now:

- creates a `jobs` row
- creates an `import_batches` row with `status = processing`
- publishes a `csv_import` task to RabbitMQ
- returns immediately with `job_id` and `batch_id`

This is a major difference from the old Phase 2 docs, which still describe a synchronous 9-step API request pipeline.

## Step 5 - Background worker execution

`platform/worker/background_worker.py`

The worker:

- listens on `background_tasks`
- processes `csv_import` tasks
- updates the `jobs` table as progress changes
- calls `ContactService.bulk_upsert` in chunks of 50 contacts
- updates the final `jobs` and `import_batches` records

The practical behavior is:

- imports are asynchronous
- the UI polls for progress
- a batch can complete with partial success
- the batch record remains the source for import history and failure details

The import path also now skips fully blank rows before they enter the queued job:

- blank row = empty email plus no mapped custom-field values
- skipped blank rows are not counted as failed contacts
- import responses now include `skipped_blank`

## Step 6 - Validation, deduplication, and plan limits

`platform/api/services/contact_service.py`

### Email validation

- regex-based validation through `validate_email`
- invalid rows are collected into an `errors` array with row number and reason

### Deduplication

- within the uploaded payload: uses a Python `set()` and keeps the first occurrence
- across existing contacts: uses database upsert on `tenant_id,email`

### Plan-limit logic

The service does something important and correct:

- counts existing contacts already in the tenant
- counts how many uploaded emails already exist
- only genuinely new contacts count against the tenant plan

This means:

- re-importing existing contacts does not consume new quota
- updating names for existing emails does not consume new quota

### Important current behavior

The worker processes imports in chunks of 50, and each chunk calls `bulk_upsert` separately. That means plan-limit checks happen chunk by chunk, not once for the entire file.

Operational consequence:

- a large import can partially succeed until the limit is reached
- later chunks can fail after earlier chunks already inserted data

So the real system behavior is not full all-or-nothing import rejection for oversized files. The docs must describe this honestly.

## Data Model Used by the Running Code

The active Phase 2 implementation uses these contact-level concepts:

- `tenant_id`
- `email`
- `first_name`
- `last_name`
- `status`
- `tags`
- `custom_fields`
- `import_batch_id`
- `email_domain`
- `created_at`

The import history path uses:

- `import_batches`
- `jobs`

### Important schema truth

There is a migration that creates `contact_custom_fields`, but the running Phase 2 code does not use that table for contact storage. Custom fields are currently stored in `contacts.custom_fields` as JSON-like structured data.

That means the main narrative for Phase 2 should describe:

- actual runtime storage in `contacts.custom_fields`

and only mention `contact_custom_fields` as a legacy or unused migration artifact.

## Frontend Flow

## Contacts list page

`platform/client/src/app/contacts/page.tsx`

Implemented behaviors:

- stats bar from `/contacts/stats`
- paginated contacts table from `/contacts/`
- simple search
- dynamic custom-field columns based on current page data
- select-all and multi-select delete
- delete all
- import modal
- export CSV button
- import-history tab from `/contacts/batches`
- failed-row resolve action
- job polling via `/contacts/jobs/{job_id}`
- suppression-page navigation
- compact search plus batch plus domain filter flow
- domain summary API integration
- domain-scoped filtering for the main contacts table

## Contact detail page

`platform/client/src/app/contacts/[id]/page.tsx`

Implemented behaviors:

- fetch one contact
- show identity, status, created date, custom fields, and tags
- add and remove tags
- edit email
- edit custom fields

Not implemented:

- actual contact activity timeline
- campaign interaction history

So the original wording "see individual contact activity" is not accurate for the current code.

## Suppression list page

`platform/client/src/app/contacts/suppression/page.tsx`

Implemented behaviors:

- fetch suppressed contacts
- pagination
- shows bounced, unsubscribed, and complained statuses

## Batch detail page

`platform/client/src/app/contacts/batch/[batchId]/page.tsx`

Implemented behaviors:

- loads one batch by filtering the batch list response
- loads contacts filtered by `batch_id`
- supports search within the batch view
- supports domain breakdown inside a batch
- supports multi-domain filtering inside the batch
- surfaces suspicious typo-like domains through suggested corrections

## Domain-aware audience model

Phase 2 now also owns the first usable domain segmentation layer for contacts.

Implemented behaviors:

- contacts store `email_domain`
- import normalizes and stores domain values from email addresses
- `/contacts/domains` returns domain counts
- domain summaries can be scoped by `batch_id`
- suspicious typo-like domains such as `gmila.com` can return `suggested_domain`
- campaign audience selection can target:
  - all contacts
  - one import batch
  - one domain inside a batch
  - multiple domains inside a batch

This is still not a full generic segmentation engine, but it is real domain-based audience filtering and should be documented as such.

## Migration and schema alignment

The current code now depends on ordered top-level migrations for the runtime contacts path:

- `migrations/019_phase2_contacts_alignment.sql`
- `migrations/020_contacts_email_domain.sql`
- `migrations/manual_apply_latest_runtime_sync.sql`

These files matter because the running code now expects:

- `import_batches`
- `contacts.custom_fields`
- `contacts.tags`
- `contacts.import_batch_id`
- `contacts.email_domain`

Without those schema updates, the current contacts and campaign audience flows can fail at runtime.

## Verified Completion Matrix

### Backend

- CSV/XLSX ingestion: done
- preview endpoint: done
- async import job creation: done
- RabbitMQ background import worker: done
- batch tracking: done
- deduplication: done
- email validation: done
- plan-limit enforcement for new contacts only: done
- bulk delete: done
- delete all: done
- batch delete: done
- contact detail API: done
- contact update API: done
- tags update API: done
- suppression list API: done
- export CSV API: done
- simple search by email and name: done
- domain summary API: done
- batch-scoped domain summary: done
- suspicious typo-domain suggestion logic: done

### Frontend

- contacts list page: done
- pagination: done
- simple search: done
- upload preview and import flow: done
- async job polling UI: done
- import history tab: done
- batch detail page: done
- batch-scoped domain filtering: done
- multi-domain filter inside batch page: done
- batch delete flow: done
- bulk delete flow: done
- delete all flow: done
- contact detail page: done
- contact detail editing for email and custom fields: done
- tags UI: done
- suppression list page: done
- export button: done
- campaign audience step supports batch-domain targeting: done

## Not Done or Not Done as Originally Described

- true segment builder UI: not implemented
- backend segmentation filters beyond simple search and batch filtering: not implemented
- search by tag: not implemented in backend list query
- full standalone tags CRUD model: not implemented
- soft delete with `deleted_at` and restore window: not implemented
- contact activity timeline on the detail page: not implemented
- consistent design-system adoption on contacts pages: not implemented
- real mailbox existence verification: not implemented
- MX/API-based deliverability verification: not implemented

## Known Technical Gaps

### 1. Hardcoded API base URLs

The contacts frontend still hardcodes:

- `http://localhost:8000`
- `http://127.0.0.1:8000`

This should be moved to shared environment-driven config.

### 2. Inline-style-heavy frontend

The contacts module is functional, but it still bypasses much of the shared Phase 0 component system. This increases UI inconsistency and maintenance cost.

### 3. Legacy artifacts still exist

There are older contacts-related code paths and schema assumptions in the repository, including old `main.py` contacts endpoints and the unused `contact_custom_fields` pattern. Readers need to know which path is current and which is legacy.

### 4. Partial-import semantics

Because the worker chunks imports and applies limits chunk by chunk, a large file can partially import instead of failing atomically. This is a real behavior, not just a documentation issue.

### 5. Limited failure resolution

`resolve-error` supports manual correction, but its plan-limit check assumes one new contact and does not distinguish between a genuine new row and an update to an existing email.

## Recommended Next Work

1. Decide whether imports should be atomic or partial.
2. Replace hardcoded API URLs with environment-based frontend config.
3. Decide whether domain filtering should expand into a real segment builder or stay as targeted audience filtering.
4. Add real email verification only with an async MX/API-backed design, not inline import blocking.
5. Add soft-delete support only when the schema, APIs, and restore UX all exist together.
6. Move the contacts UI onto shared Phase 0 components instead of large inline-style pages.
7. Remove or clearly isolate legacy contacts code paths and schema narratives.

## Bottom Line

Phase 2 is not missing. It is already a working contacts system with import, batch history, suppression handling, tags, export, and list management.

The correction needed is accuracy:

- describe the current implementation as async and queue-backed
- describe search as simple search, not segmentation
- describe domain filtering and batch-domain targeting as implemented
- describe custom fields as stored on the contact record, not primarily in a separate custom-fields table
- stop claiming soft delete and contact activity features that the code does not currently provide
