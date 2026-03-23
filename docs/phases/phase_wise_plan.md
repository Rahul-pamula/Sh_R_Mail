# Email Engine — Phase-wise Plan

> This document is the **strategic planning guide** for the Email Engine platform.
> It describes what each phase is, why it exists, what it covers, and the technical architecture behind it.
> Progress tracking (what is done vs. pending) lives in the **interactive HTML tracker** (`docs/tracker.html`).

---

## System Architecture — Dual Email Engine

A foundational design decision governs the entire platform: **two completely separate email pipelines** exist side-by-side.

### 1. Centralized System Emailer (Gmail SMTP)
Uses `shrmail.app@gmail.com` via standard SMTP. This pipeline handles all critical platform-to-tenant communications — things like OTP verifications, sender identity confirmation, quota warnings, welcome emails, and campaign completion summaries. It must never go to spam, so it uses a trusted Gmail account rather than a custom domain.

### 2. Tenant Campaign Emailer (Amazon SES)
Uses the tenant's own verified custom domain (e.g. `sales@theircompany.com`) via AWS SES. This is the high-volume, high-throughput pipeline dedicated to marketing campaigns and bulk outreach. It keeps each tenant's sender reputation completely isolated from the platform itself.

---

## Phase 0 — UI/UX Foundation & Design System

**Why this phase exists:** Before any feature UI is built, the design language must be defined. This phase creates the visual tokens, reusable component library, interaction rules, and accessibility baseline that every product page will inherit.

**What is planned:**

The design system is rooted in a dark-mode first approach using CSS variables defined in `globals.css` and bridged to Tailwind utilities via `tailwind.config.ts`. The typography scale, color semantics (backgrounds, borders, text, accents), and spacing rhythm are all expressed as tokens. A light mode variant is planned — the token layer makes this a pure CSS variable swap without touching component code.

The shared component library lives at `platform/client/src/components/ui/` and includes building blocks like `Button`, `Badge`, `StatCard`, `DataTable`, `EmptyState`, `ConfirmModal`, `Toast`, and `PageHeader`. Every feature page should be composed from these primitives rather than using ad-hoc inline styles.

Every product page follows a standard layout model: breadcrumb → page header → optional stat row → data table or content block → empty state when no data exists → toast feedback for async actions → confirm modal for any destructive action.

**Loading skeletons** replace blank screens during API loading. Every list page (contacts, campaigns, templates) shows a pulsing placeholder row layout while data is being fetched — improving perceived performance significantly.

**Design Tokens Documentation Page:** An internal `/docs/design-tokens` page (or Storybook-style reference) documents every token name, its CSS variable, and its visual output. This prevents teams from re-inventing decisions already made at the token level.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, CSS Variables, Inter font via `next/font/google`, `lucide-react` for icons.


---

## Phase 1 — Foundation, Auth, Tenant Identity & Onboarding

**Why this phase exists:** This turns a standalone app into a multi-tenant SaaS product. Every piece of data, every API call, and every UI route must be scoped to an authenticated tenant. This phase establishes that identity layer.

**What is planned:**

Authentication uses a custom JWT model — email/password verified with `bcrypt`, JWT tokens verified by middleware on every protected route. The token carries `tenant_id`, `user_id`, `role`, and `email`. The frontend React context (`AuthContext.tsx`) distributes this session state, and `middleware.ts` handles request-time redirects to protect routes.

The tenant model consists of three tables: `users`, `tenants`, and `tenant_users` (the join table that governs role and workspace membership). A user can belong to multiple tenants and switch between them via workspace switching.

Onboarding is a multi-step wizard (`workspace → use-case → integrations → scale → complete`) that gates full platform access until the tenant identity is considered complete. Email verification is performed before onboarding completes — unverified emails cannot progress past the first wizard step.

Social login (Google, GitHub) is integrated via OAuth 2.0 through Supabase Auth. Password reset uses Supabase's built-in email flow routed through the Centralized System Emailer.

**Session management:** Access tokens are short-lived (15–30 minutes). Refresh tokens extend the session silently. A `token_version` counter on each user row enables token revocation — incrementing the version invalidates all issued tokens for that user immediately (force-logout from all devices).

**Rate limiting on login:** The login and registration endpoints are rate-limited per IP and per email (e.g., 10 attempts per minute) to prevent brute-force attacks. Repeated failures trigger a temporary lockout and alert the user via the Centralized System Emailer.


---

## Phase 1.5 — Auth Hardening & Audit Logging

**Why this phase exists:** After the core auth works, the system needs to be hardened. Sensitive operations must be observable, and the auth UX must be production-quality.

**What is planned:**

An audit log table captures who did what and when — specifically metadata about important tenant actions (who deleted 10,000 contacts, who changed the plan, who triggered a campaign send). The log stores `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, and a timestamp. Critically: the audit log must never contain sensitive data like actual email addresses, CSV row contents, or email bodies — only metadata.

**Immutable logs:** The audit log table is write-only — no UPDATE or DELETE is permitted on log rows. Only INSERT is allowed. This means even an admin cannot erase their own actions.

**Log severity levels:** Each log entry carries a severity: `INFO` (normal operations), `WARNING` (unusual but not dangerous actions), and `CRITICAL` (high-risk actions like bulk delete of 1,000+ contacts, plan downgrade, API key deletion). The viewer lets owners filter by severity.

**Automated alerts on critical log events:** When a `CRITICAL` severity log is created — such as a bulk delete exceeding 1,000 contacts, a suspicious login from a new country, or a campaign sent to more than 90% of the contact list at once — an alert email is dispatched via the Centralized System Emailer to the workspace owner.

A front-end audit log viewer in the admin settings area lets workspace owners see this activity timeline.

Two-factor authentication (TOTP) for workspace admins is planned for this phase, enforcing an extra identity layer for high-privilege accounts.

---

### 🔴 Critical Security Fixes [ADDED FROM AUDIT]

These items were identified during the Phase 1 architect review. They must be resolved before any real tenant data is onboarded.

**Fix 1 — Cross-tenant webhook suppression** *(Effort: 0.5 days)*
`_suppress_contact()` in `webhooks.py` queries contacts by email with no `tenant_id` filter. A single SES bounce suppresses that email across **all tenants** on the platform. Fix: thread `tenant_id` from the campaign record through the SES webhook handler and add `.eq("tenant_id", tenant_id)` to the contact lookup.

**Fix 2 — JWT refresh token + revocation model** *(Effort: 2 days)*
`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7` (7-day non-revocable tokens). If a user's account is compromised there is no way to force-logout. Fix: reduce access token lifetime to 30 minutes, add a `POST /auth/refresh` endpoint that issues a new access token against a long-lived refresh token stored as an HttpOnly cookie, and add a `token_version` integer column on the `users` table. Incrementing `token_version` invalidates all issued tokens for that user immediately.

**Fix 3 — CORS locked to frontend origin** *(Effort: 0.5 days)*
`allow_origins=["*"]` in `main.py` allows any website to make credentialed requests to the API. Fix: read `FRONTEND_URL` from the environment and set `allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")]`. Allow `localhost:3000` only when `ENV=development`.

**Fix 4 — SSL certificate verification in worker** *(Effort: 0.5 days)*
`ssl.CERT_NONE` was added as a macOS Python 3.13 dev workaround and must not go to production. Fix: enable certificate verification by default; add an `AMQP_SKIP_TLS_VERIFY=true` environment flag that can be set locally only.

**Fix 5 — Remove scaffolding endpoints and dev artifacts** *(Effort: 0.5 days)*
`POST /contacts/upload` (line 215) and `POST /test-send` (line 256) in `main.py` bypass tenant isolation, RabbitMQ, and rate limiting. Fix: delete both routes. Also remove `db_check.py`, `db_check2.py`, `generate_test_csv.py` from the repo root, `platform/api/app.db` (old SQLite artifact), and `frnds_contacts.csv` / `testmail_contacts.csv` (real contact data committed to VCS). Add `*.db` and `*.csv` to `.gitignore` and run `git filter-repo` to purge from history.

**Fix 6 — Duplicate events router registration** *(Effort: 0.5 days)*
`app.include_router(events.router)` is called twice in `main.py` (lines 168 and 177). FastAPI silently allows this but it doubles route entries in the OpenAPI spec and is a source of confusion. Fix: remove the second `app.include_router(events_router.router)` call.

**Fix 17 — OAuth State Parameter** *(Effort: 0.5 days) [ADDED FROM FRIEND AUDIT]*
The OAuth implementation (`/auth/google/login`) does not use a state or nonce parameter. This makes the login flow susceptible to Cross-Site Request Forgery (CSRF). Fix: Require and validate a random `state` string in the OAuth flow.

---

## Phase 1.6 — GDPR & Legal Compliance

**Why this phase exists:** Before onboarding paying customers — especially those with EU users — the platform must respect data subject rights. A user who uploads 50,000 contacts must be able to delete them, export them, and prove consent.

**What is planned:**

**Data export** is an async job: the tenant requests an export, receives a `job_id`, polls for completion, then downloads a ZIP file. This avoids HTTP timeout issues on large datasets.

**Right to be forgotten** works by anonymizing rather than deleting — the contact row is kept (to preserve campaign history integrity) but PII fields are overwritten: email becomes `deleted@gdpr.invalid`, name becomes `[Deleted]`.

**Soft delete** adds a `deleted_at` timestamp to contacts, campaigns, and templates. Queries filter `WHERE deleted_at IS NULL`. A 30-day restoration window exists before permanent erasure.

**Consent tracking** captures the source (`imported via CSV on this date`), consent date, and consent IP on every contact row at import time.

**Data retention policy:** Contacts who have not been emailed or updated in a configurable period (default: 24 months) are automatically flagged for review and optionally purged. This reduces legal risk and improves deliverability (dead contacts hurt sender reputation).

**Consent re-validation:** If a contact's consent record is older than a configurable threshold (e.g. 24 months), they are automatically excluded from future campaigns until re-consent is captured through a re-permission campaign.

**"Do Not Contact" (DNC) global suppression:** Separate from the per-tenant unsubscribe list — the DNC list is a platform-level suppression that blocks even transactional emails to specific addresses. This is required for regulatory compliance in enterprise contexts and for contacts who have sent abuse reports.

---

## Phase 2 — Contacts Engine

**Why this phase exists:** Contacts are the core dataset of the platform. Everything — campaigns, analytics, suppressions — operates on a contact list. This phase builds the full lifecycle for importing, managing, and segmenting contacts.

**What is planned:**

**Import pipeline:** Tenants upload CSV or XLSX files. The backend previews and maps columns, creates an async import job, and pushes it to a RabbitMQ worker. The worker imports contacts in chunks (deduplicating by email + tenant), handles errors gracefully, and records import batch history. Large batches can partially succeed.

**Real-time contact ingestion API:** In addition to CSV upload, a REST API endpoint (`POST /v1/contacts`) accepts individual contact records in real-time. This enables integrations with web forms, Shopify stores, landing page builders, and CRMs — without requiring a CSV export cycle.

**Email validation layer:** At import time (and on single-contact ingestion), each email address is validated at three levels: syntax check (RFC-compliant regex), MX record check (the domain actually has a mail server), and disposable email detection (block `@mailinator.com`, `@tempmail.com`, etc.). Contacts failing validation are rejected with a clear error reason.

**Contact scoring system:** Each contact is assigned an engagement score (`engaged`, `at-risk`, `inactive`, `risky`) based on recent activity — open history, bounce history, complaint history, and time since last engagement. The score is visible in the contacts list and is factored into audience health warnings before campaign sends.

**Duplicate resolution UI:** When a CSV import detects a contact that already exists (same email, different name or custom fields), rather than silently overwriting, a resolution UI surfaces the conflict and lets the tenant choose which values to keep.

**Contact management:** Each contact stores email, name, custom fields, tags, domain, status (`subscribed`, `unsubscribed`, `bounced`, `complained`), consent metadata, and engagement score. Contacts can be searched, filtered by domain or batch, tagged, edited, bulk-deleted, and exported to CSV.

**Suppression List:** Contacts marked as bounced, unsubscribed, or complained are shown in a dedicated suppression list view. These contacts are automatically excluded from all future campaign dispatches.

**Audience targeting in campaigns:** Contacts can be targeted by full list, by import batch, by email domain, or by a combination of batch + specific domain inside that batch.

**Segmentation:** A filter-based segment builder allows targeting by any contact field value combination.

---

### 🟡 Contact Engine Fixes [ADDED FROM FRIEND AUDIT]

**Fix 18 — Streaming CSV Uploads** *(Effort: 2 days)*
The `/contacts/upload` endpoint reads entire CSV/Excel files into `pandas` memory. A 1GB CSV file will crash the API via Out-Of-Memory (OOM). Fix: Replace the pandas in-memory parser with Python's built-in `csv` module parsing over an async byte stream to support massive contact lists without memory bloat.

---

## Phase 3 — Template Engine

**Why this phase exists:** Email content must be composable, reusable, and correctly rendered across all major email clients. Templates are the content layer that campaigns rely on.

**What is planned:**

A structured block editor (`/templates/[id]/block`) lets tenants compose emails using a rows → columns → blocks model. Template design JSON is compiled server-side via MJML into render-safe HTML. The editor supports preset starter designs, a full preview mode, and spintax (random content rotation) and merge tag (`{{first_name}}`) support.

Template versioning will allow tenants to save and restore older drafts of any template. A plain-text companion will be auto-generated from the HTML to improve deliverability (spam filters penalize HTML-only emails). A "View Online" link will allow recipients to view the email in a browser without authentication.

**Spam score checker:** Before a template can be used in a campaign, a spam score check is run against the email body (subject + HTML). The check uses SpamAssassin-style heuristics — flagging trigger words, excessive links, missing plain text, image-to-text ratio imbalance, and missing unsubscribe. A score above a configurable threshold blocks sending and surfaces the specific fail reasons.

**Mobile preview mode:** The template editor includes a side-by-side desktop/mobile toggle. The mobile view renders the MJML-compiled output at a 375px viewport to simulate how the email looks on a smartphone screen.

**Inbox preview (client simulation):** A simulated rendering preview shows how the email would appear in Gmail, Outlook, and Apple Mail — highlighting client-specific rendering quirks (e.g., Outlook's limited CSS support, Gmail's stripped `<style>` tags).

**Send test email button:** Tenants can enter any email address from the template editor and receive a real rendered test email — including merge tag substitution with sample data.

---

## Phase 4 — Campaign Orchestration

**Why this phase exists:** Campaigns are the main product action — sending a targeted email to a filtered contact list. This phase handles the full lifecycle from creation through dispatch.

**What is planned:**

The campaign lifecycle: a tenant creates a campaign (name, sender identity, subject, body, audience), reviews a pre-send checklist, and sends or schedules it. The backend snapshots the campaign content at send time (so edits after dispatch don't affect in-flight emails), generates dispatch records per recipient, and publishes tasks to the RabbitMQ worker.

Campaigns support spintax processing (random subject line rotation) and merge tags (personalized fields per contact). Scheduling lets campaigns be sent at a specific future date and time. In-flight campaigns can be paused or cancelled. Suppressed contacts (unsubscribed or bounced) are excluded from all dispatch paths before any email is sent.

**Automated pre-send validation checklist:** The pre-send step automatically checks: subject line is not empty, unsubscribe link is present, email body is not blank, physical address is present, spam score is within acceptable range, and audience is not empty. Any failed check blocks sending with a clear explanation — the tenant cannot override a failed critical check.

**Send throttling control:** The worker respects a configurable per-minute send rate per campaign. This prevents hitting AWS SES per-second rate limits and allows graceful warm-up behaviour for new sending domains. The UI shows the estimated completion time based on the throttle rate.

**"Send to 5% sample first" mode:** Before committing to a full broadcast, tenants can send the campaign to a random 5% of the audience. After reviewing the analytics, they can then release it to the remaining 95% — or abort entirely.

---

## Phase 5 — Delivery Engine

**Why this phase exists:** Emails must actually arrive in inboxes. This phase builds the sending pipeline, legal compliance requirements, and automatic response handling for bounces and spam complaints.

**What is planned:**

A RabbitMQ consumer worker pulls dispatch tasks and sends emails via AWS SES SMTP. It handles TLS negotiation dynamically, retries failed sends with exponential backoff, and routes permanently failed messages to a dead-letter queue.

Every email sent by the platform automatically has an unsubscribe link injected into the footer (HMAC-signed token linking to the backend unsubscribe route), along with a physical business address in the footer (CAN-SPAM compliance).

**Bounce classification:** Bounces are classified before any action is taken. A **hard bounce** (permanent failure — invalid address, domain doesn't exist, user rejected) immediately marks the contact as `bounced` and suppresses them permanently. A **soft bounce** (temporary failure — mailbox full, server temporarily unavailable) is retried up to 3 times with exponential backoff before being escalated to a hard bounce. Worker exceptions caused by infrastructure issues (DB timeout, network failure) do not trigger bounce suppression — only confirmed SMTP/SES failure codes do.

**Domain warmup automation:** New sending domains start with a low daily send limit (e.g. 50 emails/day) and automatically increase it on a graduated schedule over 30 days. The worker enforces the warmup cap and rejects dispatch overflow for the day. The tenant sees the current warmup status and estimated final limit in the dashboard.

**Send reputation scoring per tenant:** The platform tracks each tenant's bounce rate and spam complaint rate on a rolling 30-day window. Tenants who exceed 2% bounce rate or 0.1% complaint rate are automatically throttled and warned. Tenants who breach both thresholds simultaneously have their sending suspended pending a manual review.

**Spam complaint handling:** SES webhooks post complaint events. The backend marks the contact as `unsubscribed`, adding them to the suppression list. This satisfies ISP feedback loop requirements.

**Unsubscribe flow:** When a recipient clicks the unsubscribe link, the backend verifies the HMAC token, marks the contact as `unsubscribed`, logs an `unsubscribe` event into `email_events` (for analytics tracking), and redirects the user to the frontend confirmation page. The confirmation page auto-closes the browser tab after 3 seconds and offers a re-subscribe option.

**Re-subscribe flow:** From the confirmation page, a recipient can re-subscribe by entering their email. The backend updates their status back to `subscribed`. Analytics correctly reflects the re-subscription — the Unsubscribes count and recipient status update to reflect the current live state of each contact.

---

### 🟡 Delivery Engine Fixes [ADDED FROM AUDIT]

**Fix 7 — Soft vs hard bounce classification** *(Effort: 2 days)*
Currently every SES bounce — temporary or permanent — permanently suppresses the contact. SES SNS payloads carry `bounceType: "Permanent"` vs `"Transient"` vs `"Undetermined"`. Fix: in `webhooks.py`, parse `bounceType` before calling `_suppress_contact()`. Only `Permanent` bounces suppress immediately. `Transient` bounces increment a `soft_bounce_count` column and suppress only after reaching threshold (e.g. 3 consecutive soft bounces). `Undetermined` bounces are logged and monitored but do not suppress. Worker infrastructure failures (DB timeout, AMQP disconnect) must never trigger suppression — only confirmed SMTP/SES rejection codes should.

**Fix 8 — Real rolling bounce rate writer (circuit breaker)** *(Effort: 1.5 days)*
`email_sender.py` reads `tenant:{id}:metrics:rolling_bounce_rate` from Redis to auto-pause a campaign, but **nothing writes that key** — the circuit breaker can never fire. Fix: after every bounce event in `webhooks.py`, increment a Redis counter `tenant:{id}:bounces:rolling` with a 30-day TTL, and compute the rate against `tenant:{id}:sent:rolling`. The auto-pause logic in the worker then reads a real value and functions correctly.

**Fix 9 — Move scheduler out of the API process** *(Effort: 2 days)*
`_run_scheduler()` runs as `asyncio.create_task` inside the FastAPI lifespan. When two API replicas run, **both poll and risk double-dispatching the same campaign**. The `claim_scheduled_campaign()` optimistic lock mitigates this but is fragile. Fix: flesh out `platform/worker/scheduler.py` as a standalone entrypoint. Protect the poll loop with a Redis `SET NX EX 90` distributed lock (90-second TTL, 60-second poll interval) so only one scheduler instance runs at any time across all replicas.

**Fix 19 — Batch DB Updates in Worker** *(Effort: 2 days) [ADDED FROM FRIEND AUDIT]*
The worker currently executes a `db.table(...).update(...)` for **every single email**. For a campaign of 100,000 recipients, this translates to 100,000 individual HTTP requests to Supabase just to claim rows, and another 100,000 to mark them sent. This is a severe bottleneck. Fix: Refactor `email_sender.py` to batch dispatch row updates (e.g., updating 500 rows at once) or utilize Postgres stored procedures/RPC to claim batches atomically.

**Fix 20 — Native DB Connection for Worker** *(Effort: 1.5 days) [ADDED FROM FRIEND AUDIT]*
The Python services use the Supabase REST API (PostgREST) via `httpx`. While stateless, this introduces significant HTTP overhead and forces HTTP/1.1 downgrades. Fix: Switch the worker from the Supabase PostgREST client to `asyncpg` for direct, high-performance PostgreSQL TCP connections.

---

## Phase 6 — Observability & Analytics

**Why this phase exists:** Tenants need to know if their campaigns are working. Open rates, bounce rates, unsubscribes, and recipient-level activity give tenants actionable data to improve their email strategy.

**What is planned:**

**Open tracking:** A 1×1 pixel image is injected into every email. When the recipient opens the email, their client downloads the image from a Supabase Edge Function, which logs the open event. The edge function performs bot detection — signals from known proxies (Gmail Image Proxy, Apple Mail Privacy Protection, Outlook, Yahoo) are correctly identified by source and still counted, since they represent real opens by users of those clients.

**Click tracking:** Click tracking is disabled by default to reduce Supabase Edge Function invocations and costs. Tenants can opt in to click tracking on a per-campaign basis. When enabled, click events are tracked through a redirect endpoint and stored in `email_events` with `event_type = 'click'`.

**Click-Through Rate (CTR):** When click tracking is enabled for a campaign, the analytics dashboard shows CTR as a stat card — unique clicks divided by unique opens, expressed as a percentage.

**Campaign Analytics Dashboard** displays: Sent, Opens (Unique), Opens (Total), Bounce Rate, Unsubscribes — all as stat cards. A "Proxy / Scanner Signals" breakdown shows the source distribution (Gmail Proxy, Apple MPP, Outlook, Yahoo, Scanner, Human). A Recipient Activity table shows every recipient's individual open, bounce, and unsubscribe status.

**Engagement over time graph:** The analytics page includes a time-series chart showing opens, bounces, and unsubscribes plotted by hour for the first 72 hours after send. This helps tenants understand their audience's open-time behaviour and choose better send times.

**Analytics export:** Campaign analytics can be exported as a CSV (or PDF summary) — giving tenants a report they can share with their team or stakeholders without login access.

**Note on Gmail Proxy:** When a Gmail user opens an email, Google's Image Proxy server downloads the tracking pixel on their behalf. This is a deliberate privacy feature by Google. All Gmail opens will register as `gmail_proxy`. This is expected and correct — it does NOT mean the open was from a bot.

---

## Phase 7 — Plan Enforcement & Billing

**Why this phase exists:** Without enforced limits, a single tenant could send millions of emails and overload the platform. Plans define fair usage boundaries and create a revenue model.

**What is planned:**

A `plans` table defines tiers (Free, Starter, Pro, Enterprise) with limits on monthly email volume and maximum contact count. A daily send limit is also enforced per tenant and resets at midnight.

**Trial period:** New tenants receive a 14-day free trial with Pro-tier limits, no credit card required. After the trial, the account automatically downgrades to the Free tier unless a plan is selected.

**Overage pricing instead of hard blocking:** When a tenant exceeds their monthly quota, instead of blocking the campaign entirely, the system charges a per-email overage rate (e.g. $0.002 per extra 1,000 emails). Hard blocking is reserved only for tenants on the Free tier. This prevents revenue loss from tenants who need occasional bursts above their plan limit.

**Auto-downgrade logic:** When a paid subscription lapses (cancelled or payment failed), the account gracefully downgrades to Free tier limits. Campaigns that would have exceeded free limits are paused — not deleted — and resume automatically if the subscription is restored within the grace period.

**Grace period for failed payments:** Payment failures do not immediately restrict the account. A 7-day grace period is provided — the tenant receives email reminders on days 1, 3, and 7. Restrictions only apply after the grace period expires.

**Quota warning notifications** are sent (at 80% usage) via the Centralized System Emailer. The frontend shows a usage page with progress bars for emails sent vs. limit and contacts used vs. limit. In-app banners appear as the quota is approached and exceeded.

---

### 🟡 Plan Enforcement Fix [ADDED FROM AUDIT]

**Fix 10 — Wire quota check to the dispatch path** *(Effort: 2 days)*
The `plans` DB schema exists (migration 007) and the billing route stub exists. However, `queue_campaign_dispatch()` in `campaign_dispatch_service.py` does not check monthly quota before publishing tasks to RabbitMQ. A Free-tier tenant can currently send unlimited emails. Fix: add a quota gate at the start of `queue_campaign_dispatch()` — query the tenant's plan limits and current month's `emails_sent` counter; raise a `429 QuotaExceeded` error before any RabbitMQ publish if the limit is reached. For paid tiers, apply overage pricing logic instead of blocking.

---

## Phase 7.5 — Infrastructure & DevOps

**Why this phase exists:** The application must be deployable, monitorable, and maintainable. This phase covers containerization, CI/CD, security headers, rate limiting, and health checks.

**What is planned:**

Docker and docker-compose set up the full local and production stack. Nginx handles reverse proxying. CI/CD via GitHub Actions automates test and deploy pipelines. SSL/HTTPS is configured via Let's Encrypt.

API rate limiting is enforced per-tenant per-endpoint (not just per-IP) to protect against abuse. Health check endpoints on both the API and the worker expose real-time service status to monitoring tools. Content Security Policy headers are applied to all frontend pages.

A generic `jobs` table tracks the progress of long-running background operations (CSV import, GDPR export, campaign compilation) so the frontend can show real progress bars rather than making users wait blindly.

**Centralized structured logging:** All API and worker logs are emitted as structured JSON and shipped to a centralized logging stack (ELK — Elasticsearch, Logstash, Kibana — or Grafana Loki as a lighter alternative). This enables searchable, filterable, retained logs across all services — replacing ephemeral Docker stdout.

**Error tracking (Sentry):** Sentry is integrated into both the FastAPI backend and the Next.js frontend. Every unhandled exception, 500 error, and worker crash is captured with full stack trace, request context, and tenant ID. A weekly digest of the top 5 error sources is sent to the engineering team.

**Database backup strategy:** Supabase automated backups run daily and are retained for 30 days. A documented restore procedure is tested monthly — including a timed full-restore drill in a staging environment. The target recovery time objective (RTO) is under 1 hour.

---

### 🟡 Infrastructure Fixes [ADDED FROM AUDIT]

**Fix 11 — Uncomment Nginx before any production deploy** *(Effort: 0.5 days)*
The Nginx reverse proxy block in `docker-compose.yml` is commented out. The API (port 8000) and frontend (port 3000) are exposed directly to the internet. Fix: uncomment the Nginx service block, configure it to proxy `/api` to the API container and `/` to the frontend container, and close ports 8000 and 3000 from the public network.

**Fix 12 — GitHub Actions CI/CD pipeline** *(Effort: 2 days)*
All deploys are currently manual. Fix: create `.github/workflows/deploy.yml` that runs on merge to `main`: lint (ruff for Python, ESLint for TypeScript), run automated tests, build Docker images, push to registry, and deploy to the server via SSH or a managed platform.

**Fix 13 — Remove real CSV files and SQLite artifact** *(Effort: 0.5 days)*
`frnds_contacts.csv`, `testmail_contacts.csv`, and `platform/api/app.db` are committed to the repository. The CSVs contain real contact data; the SQLite file misleads developers about the active database. Fix: `git rm` all three files, add `*.csv` and `*.db` to `.gitignore`, then run `git filter-repo --path frnds_contacts.csv --invert-paths` (and equivalent for the other files) to purge them from history.

**Fix 21 — Dynamic Config Loading** *(Effort: 0.5 days) [ADDED FROM FRIEND AUDIT]*
Loading `.env` explicitly via `Path(__file__)` is fragile and breaks easily if scripts are executed from different working directories. Fix: Use standard environment variable injection (e.g. `pydantic-settings`) or a dedicated robust `config.py`.

---

## Phase 7.6 — Code Quality & Hygiene [ADDED FROM AUDIT]

**Why this phase exists:** The architect review found zero automated tests, ambiguous migration numbering, and dead configuration from a previously evaluated auth system. These items create silent regression risk, block fresh deploys, and confuse future developers. They must be resolved before the codebase grows further.

**What is planned:**

**Fix 14 — Automated test suite (Priority 20 tests)** *(Effort: 4 days)*
The `tests/` directory contains only a `fixtures/` folder — no actual test files. A regression in any of the 18 API routes currently ships silently. Priority targets in order: `POST /auth/signup` (tenant creation, JWT validity), `POST /auth/login` (invalid password, unknown email, rate limit), `_suppress_contact()` (must filter by `tenant_id`), HMAC unsub token generation + verify round-trip, campaign dispatch contact count with suppressed contacts excluded, quota enforcement gate (free-tier blocked, paid-tier allowed), and bounce type classification (Permanent vs Transient).

**Fix 15 — Migration file renumbering** *(Effort: 0.5 days)*
Two files are named `012_*.sql` and two are named `013_*.sql`. On a fresh deployment, migration tooling processes files in alphabetical order — the ambiguous numbering causes unpredictable schema state. Fix: renumber to ensure every migration filename is unique and sequential: `012a` → `012`, `012b` → `012b`, or simply re-number the duplicates to `012`, `013`, `014`, `015` with a migration order manifest.

**Fix 16 — Remove dead Clerk configuration** *(Effort: 0.5 days)*
`CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` appear in `docker-compose.yml` (lines 33–34). Clerk is not the active authentication system — the platform uses a custom JWT model. The Clerk keys confuse new developers, add unnecessary credential surface area, and suggest a half-migration that never completed. Fix: remove both environment variable references from `docker-compose.yml` and `.env.example`.

**Fix 22 — Refactor Fat Controllers to Repository Pattern** *(Effort: 4 days) [ADDED FROM FRIEND AUDIT]*
Routes and workers embed direct SQL/HTTP queries to Supabase (e.g., `db.client.table("campaigns").select(...)`). This tightly couples business logic with database implementation. Fix: Abstract database calls into a Data Access Layer (DAL) or Repository pattern (e.g., `services/db.py`) to improve maintainability and testability.

**Fix 23 — Monolithic Worker Refactor** *(Effort: 2 days) [ADDED FROM FRIEND AUDIT]*
`email_sender.py` handles parsing, circuit breaking, tracking injection, actual SMTP, and DB updates in one massive try/except block. Fix: Split `email_sender.py` into distinct, focused modules (parsing, sending, tracking injection, database logging).

---

## Phase 8 — Account Settings & Administration


**Why this phase exists:** Tenants need to manage their own workspace, security settings, and developer integrations without needing to contact support.

**What is planned:**

**Settings core:** Profile editing (name, timezone), organization settings (company name, physical address for CAN-SPAM footer), and team management.

**Team Invitation Architecture:**
Team members are invited to a workspace with a specific `isolation_model` (`team` or `agency`). In `team` mode, all members share visibility of each other's contacts and campaigns. In `agency` mode, each member operates in a fully isolated silo — their data is invisible to other members. The isolation mode is set at invite time and inherited by the member on acceptance.

**Role-based permissions (fine-grained):** Beyond the current admin vs. member dichotomy, fine-grained permissions define what each role can do: `Viewer` (read-only analytics), `Operator` (can send campaigns, cannot manage billing or team), `Manager` (full access except billing), `Admin` (full access). Roles are assigned per workspace membership.

**Sender Verification Architecture:**
Instead of relying on AWS SES's built-in verification emails, the platform generates its own short-lived `verification_token` and sends a custom verification link via the Centralized System Emailer. Tokens carry an expiry time. This gives full control over the verification email's branding and timing.

**Security & compliance:** GDPR right-to-erase (PII anonymization), data export, MFA via TOTP for admins, and a compliance checklist page.

**Developer tools:** API key management (generated and stored as SHA-256 hashes), custom sending domain setup (SPF/DKIM/DMARC record guide + DNS verification), and sender identity management.

**API usage dashboard:** Tenants who use the public API see a dashboard showing their request count per day, error rate per endpoint, and remaining rate-limit quota. This helps developers debug integration issues without contacting support.

**Active session list:** The security settings page shows all active sessions — device type, browser, location (city-level from IP), and last active time. Tenants can revoke any individual session or all sessions except the current one.

---

## Phase 9 — Payments

**Why this phase exists:** The platform needs a revenue model. Stripe (or Razorpay for India) handles subscription billing, invoicing, and payment failure recovery.

**What is planned:**

Stripe integration with webhook-driven plan updates — when Stripe confirms payment, the backend upgrades the tenant's plan in the database. A pricing page shows the plan comparison table. A hosted or embedded checkout flow handles subscription setup. A billing history page shows past invoices with PDF download. Payment failure triggers an in-app banner and email alert.

**Invoice auto-email:** Every successful charge triggers an automatic invoice email to the tenant's billing contact — including a PDF attachment of the invoice with company name, plan details, and amount paid.

**GST support (India):** For India-based tenants, invoices include GST breakdown (CGST + SGST or IGST depending on state). Tenants can enter their GSTIN number in billing settings, which is printed on all invoices for compliance with Indian tax law.

**Grace period for failed payments:** Already described in Phase 7 — the billing engine defers restrictions by 7 days on a failed payment, with escalating reminder emails before any service degradation.

---

## Phase 10 — Advanced Campaigns

**Why this phase exists:** After the core campaign engine is stable, advanced features dramatically improve campaign performance and automate engagement workflows.

**What is planned:**

**A/B Testing:** Two subject line variants (or body variants) are sent to a configurable split of the audience. After a defined time window, the system automatically picks the winner (by open rate) and sends the winning variant to the remainder.

**Send time optimisation:** Based on each contact's historical open timestamps, the system predicts the optimal send time for that individual. Instead of sending a campaign at a fixed time, the worker staggers delivery so each recipient gets the email at their personal peak-engagement window.

**Auto resend to non-openers:** After a configurable wait window (e.g. 48 hours), the campaign automatically resends to contacts who did not open the original email — optionally with a different subject line.

**Drip Campaigns:** A sequence of emails sent automatically over time after a trigger event (e.g., a new contact joins a list). The builder defines the email order and delay between each step.

**Automation Triggers:** Event-driven campaign entry points (contact joins list, contact opens email, date-based triggers for birthdays or anniversaries).

---

## Phase 11 — API & Integrations

**Why this phase exists:** The platform should be connectable to external tools (CRMs, landing page builders, e-commerce platforms) via a public API, and should be able to push events to tenant-owned webhooks.

**What is planned:**

A public REST API (`/v1/send`) for transactional email sending — so tenants can send individual emails programmatically (receipts, password resets, notifications) through their verified sender identity.

**Webhook retry system:** When a tenant's configured webhook endpoint is unreachable or returns a non-2xx response, the platform retries with exponential backoff (1 min → 5 min → 30 min → 2 hrs → 24 hrs). After 5 failed attempts the webhook is marked inactive and the tenant is notified.

**API rate limiting per key:** Each API key carries its own rate limit (configurable per plan). Requests exceeding the limit receive a `429 Too Many Requests` response with a `Retry-After` header.

**SDK (JavaScript / Python):** Official SDK packages (`shrmail-js`, `shrmail-python`) wrap the REST API with typed methods, automatic retry logic, and error handling. SDKs significantly lower the integration barrier compared to raw HTTP.

Outbound webhooks notify tenant-configured URLs when key events occur (email opened, bounce received, unsubscribe processed). API key management lets tenants generate and revoke authentication keys for their API integrations.

---

## Phase 12 — Enterprise Domain Auto-Discovery (JIT Provisioning)

**Why this phase exists:** Large enterprise customers want their employees to automatically discover and request access to the corporate workspace without the IT team manually inviting each user.

**What is planned:**

When a user signs up with a corporate email domain (e.g. `@acme.com`), the system detects that a workspace already exists for that domain. Before revealing the workspace, it forces an OTP verification (to prevent enumeration attacks). After verification, the user lands in a waiting room and submits a join request. The IT administrator approves or rejects requests from a governance portal.

A PDEP (Public/Disposable Email Provider) filter blocks free email domains (Gmail, Yahoo) from triggering the discovery flow. Tenant IDs are obfuscated in all API responses to prevent workspace enumeration.

Enterprise SSO via SAML/LDAP allows companies to connect their Active Directory to the platform's authentication layer.

---

## Phase 13 — Scale & Microservices

**Why this phase exists:** Once the platform handles substantial volume (above ~100k emails/day) or the engineering team grows past 5 developers, the monolithic architecture should be decomposed for independent scaling and fault isolation.

**What is planned:**

**Infrastructure upgrades:** Replace database-backed queue polling with Redis. Implement IP warm-up scheduling (graduated send rate increase over 30 days for new sending domains). Daily blacklist monitoring via MXToolbox API.

**Horizontal scaling for workers:** The RabbitMQ consumer worker is designed as a stateless process — multiple instances can run in parallel without coordination conflicts. At scale, the number of worker instances is increased horizontally (via Docker Swarm or Kubernetes replicas) to handle increased dispatch volume without increasing per-instance memory footprint.

**Circuit breaker pattern:** A circuit breaker wraps the AWS SES SMTP connection. If SES returns consecutive failures (e.g. 5 failures in 10 seconds), the circuit opens and all further send attempts fail fast (returning to the dead-letter queue) rather than accumulating. The circuit resets after a configurable cooldown window. This prevents a cascading overload during SES outages.

**Cost monitoring:** Per-tenant AWS SES cost is tracked by correlating the monthly emails sent count against the SES per-email rate. A cost dashboard shows which tenants are the most expensive to serve. Tenants whose cost exceeds their plan revenue are flagged for plan upgrade outreach.

**Microservices decomposition:** Break the monolith into independently deployable services — auth, contacts, templates, campaigns, delivery, analytics, and notifications. Each service runs in its own Docker container. An API Gateway (Nginx or Kong) routes traffic. Services communicate via REST or RabbitMQ. The decomposition should not happen before Phase 12 — the current monolith is well-suited for the current scale.

---

## Notification Strategy

### In-App Notifications (toast & banner)
Campaign sent successfully, campaign paused, campaign failed, 80% quota warning, quota exceeded, bounce rate alert, spam complaint rate alert, domain verified, SMTP connection failed.

### Email Notifications (via Centralized System Emailer)
Welcome email after onboarding, sender identity OTP, campaign completion summary with stats, quota warnings, monthly usage summary, payment receipts, payment failed alert.

### Legal Emails (injected into every campaign email)
Every outbound campaign email must contain an unsubscribe link and a physical business address. These are injected automatically by the delivery worker — tenants cannot remove them.

---

## Operational Runbooks

### Runbook 1 — What to do if the sending IP gets blacklisted
Check IP reputation on MXToolbox, multirbl.valli.org, and Spamhaus. Identify which campaign caused the issue (high bounce or spam rate). Submit a delisting request to the blacklist provider. Clean the contact list that triggered the issue. Switch to a new SES dedicated IP and re-enable warm-up throttle. Monitor AWS SES reputation score weekly.

### Runbook 2 — Upgrading from DB queue to Redis (Phase 13)
Add Redis to docker-compose.yml. Install Celery + Redis Python packages. Create a Celery worker that consumes from Redis instead of DB polling. Keep the old DB queue as fallback for 1 week. After all tasks are confirmed processing correctly, remove the old DB polling worker. The `external_msg_id` column on tasks prevents double-sends during migration.

### Runbook 3 — Monthly operations checklist
Review bounce rate (must stay below 2%). Review spam complaint rate (must stay below 0.1%). Inspect the dead-letter queue for failed email patterns. Check MXToolbox for IP reputation. Review audit logs for unusual mass deletes or sends. Review tenant plan usage and flag those consistently hitting limits for plan upgrade outreach. Check AWS SES sending limits in the AWS Console.

---

## Database Index Strategy

These indexes are critical for query performance at scale and must be applied before the platform handles significant volume:

- `contacts(tenant_id, email)` — fast deduplication during CSV import
- `email_events(campaign_id, contact_id)` — fast analytics aggregation
- `campaigns(tenant_id, status)` — fast dashboard loading
- `audit_logs(tenant_id, timestamp)` — fast log retrieval for GDPR
- `sender_identities(verification_token)` — fast token lookup on sender verification

---

*Last updated: 2026-03-23 — reviewer suggestions integrated across all phases*
