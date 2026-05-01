# Phase 4 Technical Audit - Campaign Orchestration

> Audit basis: code verification
> Audit date: March 15, 2026
> Scope: campaign routes, models, scheduler paths, worker behavior, and campaign frontend
> Verdict: Campaign orchestration is operational, but the current docs overstate completeness and understate contract drift

## Executive Verdict

Phase 4 is implemented as a real campaign subsystem. The platform can already create drafts, edit campaigns, choose audiences, schedule sends, send immediately, insert dispatch intents, publish RabbitMQ tasks, and manage campaigns through pause, resume, and cancel.

The major problem is not absence of orchestration. The major problem is mismatch:

- docs still describe a cleaner and more complete architecture than the code actually has
- some frontend actions do not match the backend contract
- the scheduler exists in two places
- `email_tasks` is not the active orchestration primitive even though older docs say it is

The correct status is:

- orchestration core: implemented
- operator lifecycle controls: implemented
- overall completeness against original Phase 4 goals: mostly complete, not fully complete

## Audit Scope

Code paths reviewed:

- `platform/api/routes/campaigns.py`
- `platform/api/models/campaign.py`
- `platform/api/main.py`
- `platform/worker/scheduler.py`
- `platform/worker/email_sender.py`
- `platform/client/src/components/CampaignWizard/index.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step1Details.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step2Audience.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step3Content.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step4Review.tsx`
- `platform/client/src/app/campaigns/page.tsx`
- `platform/client/src/app/campaigns/[id]/page.tsx`
- `platform/client/src/app/campaigns/new/page.tsx`

## Current Technical Architecture

### API layer

FastAPI exposes campaign operations under `/campaigns`.

Verified routes:

- `POST /campaigns/`
- `GET /campaigns/`
- `GET /campaigns/{campaign_id}`
- `GET /campaigns/{campaign_id}/dispatch`
- `PATCH /campaigns/{campaign_id}`
- `PUT /campaigns/{campaign_id}`
- `DELETE /campaigns/{campaign_id}`
- `POST /campaigns/{campaign_id}/schedule`
- `POST /campaigns/{campaign_id}/send`
- `POST /campaigns/{campaign_id}/pause`
- `POST /campaigns/{campaign_id}/resume`
- `POST /campaigns/{campaign_id}/cancel`
- `POST /campaigns/{campaign_id}/preview`
- `POST /campaigns/{campaign_id}/test`

### Persistence model

The active Phase 4 orchestration model uses:

- `campaigns`
- `campaign_snapshots`
- `campaign_dispatch`

Important correction:

- the active runtime code does not orchestrate sends by inserting `email_tasks`
- the real orchestration primitive is `campaign_dispatch` plus RabbitMQ tasks

### Worker-state model

Runtime live state is intentionally split:

- Redis stores worker-facing fast state like `SENDING`, `PAUSED`, and `CANCELLED`
- PostgreSQL stores persistent campaign status for UI and querying

This is a valid pattern, but the docs need to state it directly.

### Scheduler model

There are currently two scheduler implementations:

1. embedded scheduler in `platform/api/main.py`
2. standalone scheduler in `platform/worker/scheduler.py`

Both poll for:

- `status = scheduled`
- `scheduled_at <= now`
- `is_archived = false`

and then dispatch due campaigns.

This means scheduled sending exists, but the architecture is duplicated.

## Verified Backend Logic

## 1. Campaign creation and update

`CampaignCreate` currently requires:

- `name`
- `subject`
- `body_html`
- `from_name`
- `from_prefix`
- `domain_id`

plus optional status and scheduling.

This is stricter than some frontend helper flows assume.

Create route behavior:

- verifies tenant is active
- verifies selected domain belongs to tenant and is verified
- inserts campaign row

Update behavior:

- `PATCH` allows partial updates
- `PUT` allows draft/paused editing with a separate flow

This dual-route design works, but it increases complexity.

## 2. Audience resolution

The send path supports all of these target formats:

- `all`
- `batch:{id}`
- `domain:{domain}`
- `domains:{d1,d2}`
- `batch_domain:{batch_id}:{domain}`
- `batch_domains:{batch_id}:{d1,d2}`

That is a stronger implementation than the old docs describe.

Audience filters are translated into contact queries before dispatch rows are inserted.

## 3. Send orchestration

The send route does these things in order:

1. fetches campaign and domain
2. validates state
3. resolves audience
4. enforces billing quota and daily send limits
5. inserts a `campaign_snapshots` row
6. updates campaign status to `sending`
7. sets Redis status to `SENDING`
8. inserts `campaign_dispatch` rows
9. publishes RabbitMQ tasks
10. updates send counters

This is the real orchestration backbone of Phase 4.

## 4. Scheduling

The schedule route:

- validates ownership
- only allows scheduling from `draft` or `scheduled`
- validates ISO timestamp
- rejects past time
- updates `status = scheduled`
- persists `scheduled_at`
- persists `audience_target`

The scheduling contract is real and correctly represented in code.

## 5. Pause, resume, cancel

Pause:

- sets Redis state to `PAUSED`
- sets DB status to `paused`

Resume:

- requires current DB status `paused`
- sets Redis state to `SENDING`
- sets DB status to `sending`

Cancel:

- checks whether all dispatches are already complete
- if complete and some were dispatched, normalizes to `sent`
- otherwise sets Redis state to `CANCELLED`
- updates campaign status
- marks pending dispatches as `CANCELLED`

This is a practical implementation and one of the stronger parts of Phase 4.

## 6. Worker behavior

`email_sender.py` verifies Redis state for each message:

- `CANCELLED` -> discard
- `PAUSED` -> park back into holding flow
- otherwise claim dispatch row and send

The worker then:

- injects unsubscribe footer
- injects tracking pixel
- wraps links for click tracking
- sends via SMTP
- updates dispatch status

This ties Phase 4 cleanly into Phase 5 delivery behavior.

## Verified Frontend Logic

## 1. Wizard

The campaign wizard is real and usable.

Verified capabilities:

- step-by-step flow
- local session persistence
- draft edit mode
- explicit save draft to DB
- send now vs schedule later choice
- pre-send checklist UI

## 2. Step 2 audience

The frontend audience step supports:

- all contacts
- lists
- import batches
- multi-domain selection inside a batch

This is broader than the old Phase 4 docs, which only described all contacts and a single batch.

## 3. Step 3 content

This step supports two content modes:

- compose
- template

But there is a contract bug:

- the templates API returns `data`
- the frontend reads `json.templates`

So template mode is not wired correctly to the current backend response format.

## 4. Step 4 review

The review step provides:

- summary card
- preview card
- checklist
- send-now / schedule-later toggle
- test-email modal

But two important frontend-backend mismatches exist:

### Test email mismatch

The frontend creates a temporary campaign before calling `/test`, but that temp create call omits required fields such as sender and domain data.

### Local-storage cleanup mismatch

The success path removes:

- `campaign_wizard_draft`

But the actual wizard storage key is:

- `campaign_local_sessions`

So browser draft cleanup is inconsistent.

## 5. Campaign list and detail pages

These pages are implemented and useful, with:

- status badges
- auto-refresh polling
- pause/resume/cancel controls
- metrics derived from dispatch rows
- duplicate action
- preview modal

But the duplicate action has the same contract issue as test email:

- it creates a new campaign without required sender/domain fields

So the duplicate button should not be treated as fully working.

## Technical Debt and Verified Gaps

### 1. Scheduler duplication

There are two dispatch schedulers with overlapping logic:

- embedded API scheduler
- standalone worker scheduler

This should be consolidated.

### 2. Frontend-backend contract drift

Verified examples:

- templates payload mismatch in Step 3
- duplicate campaign create payload missing required fields
- test-email temp draft payload missing required fields

These are not theoretical concerns; they are code-path mismatches.

### 3. Hardcoded API bases

Campaign frontend files mix:

- hardcoded `http://127.0.0.1:8000`
- `NEXT_PUBLIC_API_URL`

This is a real environment/configuration weakness.

### 4. No campaign service layer

The route file carries a large amount of business logic directly. That is workable for now, but it increases future maintenance cost and makes docs claiming a cleaner architecture inaccurate.

### 5. `CampaignResponse` model drift

`CampaignResponse` still references `project_id`, which does not match the current tenant-centered runtime model. This is another sign of model drift.

### 6. `email_tasks` docs are outdated

The current code does not use `email_tasks` as the active orchestration primitive. Documents that still say Phase 4 inserts `email_tasks` are wrong.

## Final Verdict

Phase 4 is not missing. It is a real, functional campaign system.

But the correct technical summary is:

- campaign CRUD: implemented
- send/schedule lifecycle: implemented
- pause/resume/cancel: implemented
- audience targeting: implemented and more advanced than old docs suggest
- template and test-email frontend flows: not fully aligned with backend contracts
- scheduler architecture: duplicated and not yet cleanly consolidated

So the right conclusion is:

**Phase 4 is mostly complete and operational, not fully complete.**

---
## Technical Appendix (Engineering view)
- Endpoints, data model, RLS, and worker/queue behaviors summarized per phase.
- See phase doc for full flow; audits now include concrete engineering artifacts to verify.
