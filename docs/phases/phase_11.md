# Phase 11 — API & Integrations

> **Status:** Not started (design/architecture only)  
> **Last Reviewed:** March 15, 2026

## Goal
Expose a stable public API (REST) and webhooks so tenants can automate sends, manage resources, and react to events without using the UI.

## Deliverables
- **API Keys v2**: scoped keys (contacts, campaigns, send), per-key rate limits, last-used metadata; rotation UX.
- **Transactional Send API**: `POST /v1/send` to send a single templated email with merge vars; respects suppression, plan limits, sender verification.
- **Resource APIs**: CRUD for contacts, lists/segments, campaigns, templates where safe; all tenant-scoped via RLS.
- **Webhooks**: tenant-configurable endpoint + secret; events for delivery, open, click, bounce, spam, unsubscribe.
- **Developer Docs**: in-app docs page + OpenAPI spec download; example cURL + client snippets.

## Data model (proposed additions)
- `api_keys`: add `scope` (enum set), `last_used_at`, `rate_limit_per_min`, `revoked_at`.
- `webhooks`: `id, tenant_id, target_url, secret, enabled, events jsonb, created_at, last_success_at, last_error_at`.
- `webhook_deliveries`: per event attempt log with status/response for troubleshooting.

## Backend plan
- Issue keys: POST `/api-keys` with scopes; hash secret (SHA-256) at rest; return plaintext once.
- Middleware: authenticate via `Authorization: Bearer <key>` → loads tenant, scopes; enforce per-key rate limit (slowapi + Redis).
- Transactional send: validate sender verified + plan limits + suppression; enqueue to worker with template rendering + merge vars.
- Webhooks: CRUD endpoints; signer uses HMAC SHA-256 over body with tenant secret; retry policy with backoff; store delivery logs.
- OpenAPI: auto-generated schema served at `/docs.json`; embed Redoc in developer page.

## Worker plan
- Accept transactional send jobs; reuse campaign sending pipeline but skip campaign snapshot; respect daily/monthly limits (Phase 7) and suppression.
- Webhook dispatcher: background task pulls pending deliveries, signs payload, retries with exponential backoff, marks success/failure.

## Security / compliance
- Enforce scopes per endpoint; default read-only key not allowed to send.
- RLS: all resource queries include `tenant_id = key.tenant_id`.
- Secrets: show API key only once; allow rotate & revoke; HMAC sign webhooks; timestamp + signature headers.

## Acceptance checklist
- API key issuance, list, revoke, rotate; scopes enforced and rate limited per key.
- Transactional send endpoint sends email, respects suppression & plan limits, records events.
- Webhooks: configure URL + events, deliveries signed, retries/backoff, delivery log viewable.
- OpenAPI spec available; developer docs page with examples.
- Monitoring: 4xx/5xx metrics per key; alert on webhook failure rate.

---
## Technical Appendix (Engineering view)
- Planned: scoped API keys v2 (hashed, scopes, per-key rate limits), transactional send API (/v1/send), public CRUD endpoints (contacts, templates, campaigns), webhooks table + deliveries with HMAC signatures, retry/backoff.
- Middleware: bearer key auth → tenant + scopes; Redis rate limit; logs scrub secrets.
- Worker: transactional send path + webhook dispatcher.
