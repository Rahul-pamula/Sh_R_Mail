# Phase 11 — API & Integrations (Technical Audit)

> **Status:** Not started — implementation pending.

## Target scope
- Scoped API keys with per-key rate limits and last-used metadata.
- Public REST for contacts, segments, campaigns, templates, transactional send.
- Webhooks for delivery/open/click/bounce/spam/unsubscribe with HMAC signatures and retries.
- Developer documentation (OpenAPI + guides) surfaced in-app.

## Design checkpoints
- **Scopes & RLS**: every key mapped to tenant_id + scopes; enforce in middleware and SQL policies. Keys stored hashed (SHA-256) with salt/pepper.
- **Rate limiting**: apply per-key + per-tenant buckets (Redis + slowapi). Exceed → 429 with retry-after.
- **Send API**: validate sender verified + plan limits (Phase 7) + suppression; enqueue to worker; record `campaign_dispatch`-like row for analytics continuity.
- **Webhooks**: HMAC SHA-256 over raw body with `X-Signature` + `X-Timestamp`; replay window check; exponential backoff with DLQ table.
- **Observability**: log key id + scope, but never the secret; emit metrics per endpoint/key; store webhook delivery attempts.

## Proposed schema
- `api_keys(id uuid pk, tenant_id uuid, name text, scope text[], hash text, rate_limit int, last_used_at timestamptz, created_at timestamptz, revoked_at timestamptz)`
- `webhooks(id uuid pk, tenant_id uuid, target_url text, secret text, events text[], enabled boolean, created_at timestamptz, last_success_at timestamptz, last_error_at timestamptz)`
- `webhook_deliveries(id uuid pk, webhook_id uuid, status text, response_code int, response_body text, attempt int, next_attempt_at timestamptz, created_at timestamptz)`

## API/Worker tasks to verify
- Middleware authenticates API keys, loads tenant_id + scopes, applies rate limit, and passes `x-tenant-id` context downstream.
- Send endpoint enqueues job with template + merge vars; worker renders, sends via SES, logs events to `email_events`.
- Webhook dispatcher signs payloads, retries with backoff, prunes DLQ; UI shows recent deliveries and failures.

## Risks
- Secret leakage in logs → ensure logging scrubs Authorization and webhook secrets.
- Abuse via send endpoint → enforce plan limits, suppression, sender verification, and per-key send caps.
- Replay attacks on webhooks → timestamp + signature window validation.

## Files to touch (future work)
- API: `/platform/api/middleware/api_key_auth.py`, `/routes/api_keys.py`, `/routes/webhooks.py`, `/routes/send.py`.
- Worker: `/platform/worker/email_sender.py` (accept transactional jobs), webhook dispatcher.
- DB: migrations under `migrations/` and `platform/database/migrations/` adding api_keys/webhooks/deliveries tables + policies.
- Frontend: `/platform/client/src/app/developer/*` for docs, key management, webhook config UI.

---
## Technical Appendix (Engineering view)
- Endpoints, data model, RLS, and worker/queue behaviors summarized per phase.
- See phase doc for full flow; audits now include concrete engineering artifacts to verify.
