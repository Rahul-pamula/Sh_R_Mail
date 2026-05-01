# Phase 5 — Delivery Engine: Technical Audit

> Audit date: March 23, 2026 (updated)
> Status: Functional — core pipeline complete, suppressions enforced, unsubscribe/analytics loop closed

## What is verified working

### Delivery pipeline
- Campaign snapshot + dispatch enqueue + worker claim/sent status flow is real and working
- SMTP/SES send is active when credentials are present; simulated otherwise
- Dynamic TLS negotiation handles Port 587 correctly
- Retry + dead-letter queue (nack on failure) is implemented
- Daily send limit pre-flight check and counter increment are active

### Compliance
- Unsubscribe link is automatically injected into every email footer (HMAC-signed token)
- Physical business address is injected into every email footer (CAN-SPAM compliant)
- Bounce webhook handler marks contact as `bounced` — preventing all future sends
- Spam complaint webhook handler marks contact as `unsubscribed` — adding to suppression list

### Suppression enforcement (fixed 2026-03-23)
- `fetch_contacts_for_target` in `campaign_dispatch_service.py` now enforces `exclude_suppressed=True`
- The standalone worker scheduler (`scheduler.py`) now enforces `exclude_suppressed=True`
- The embedded scheduler loop in `main.py` now enforces `exclude_suppressed=True`
- All dispatch paths consistently exclude bounced and unsubscribed contacts before any email is sent

### Unsubscribe flow (fixed 2026-03-23)
- Backend verifies HMAC token, marks contact as `unsubscribed`, and logs an `unsubscribe` event into `email_events`
- The tenant_id is correctly passed to the event insert — Supabase RLS no longer silently rejects the event
- Frontend confirmation page auto-closes the browser tab after 3 seconds
- A manual "Close window" fallback button is displayed on the confirmation page

### Re-subscribe flow (fixed 2026-03-23)
- Contact status is correctly updated to `"subscribed"` (was incorrectly set to `"active"` before)
- Re-subscribe page is now a proper public route — it no longer renders the internal sidebar and header
- Frontend uses `NEXT_PUBLIC_API_URL` for API calls instead of a hardcoded localhost URL (CORS resolved)
- Frontend confirmation page auto-closes the browser tab after 3 seconds after re-subscribing

### Unsubscribe page as a public route (fixed)
- `/unsubscribe` is listed in the public routes in `LayoutWrapper.tsx`
- The page renders correctly as a standalone page without any internal application chrome

## Open issues (not yet addressed)

- **Webhook auth missing**: `/webhooks/bounce`, `/webhooks/spam`, `/webhooks/ses` accept unsigned requests. Anyone can suppress contacts.
- **Over-bounce risk**: Worker marks contact `bounced` on any exception (including DB/network errors). Needs SMTP/SES error classification + retries for transient errors.
- **Daily limit overshoot**: Quota check is pre-flight only; audience is not capped by remaining quota, so a single send can exceed the limit.
- **Physical address hardcoded**: Footer uses a static address. Not tenant-configurable yet.

## File pointers
- `platform/api/routes/campaigns.py` — send flow, daily limit, audience building
- `platform/api/services/campaign_dispatch_service.py` — audience filter, `exclude_suppressed` enforcement
- `platform/worker/scheduler.py` — scheduled campaign dispatching
- `platform/api/main.py` — embedded scheduler loop
- `platform/worker/email_sender.py` — worker lifecycle, footer/tracking injection, error handling
- `platform/api/routes/webhooks.py` — bounce/spam/ses handlers
- `platform/api/routes/unsubscribe.py` — unsubscribe/resubscribe endpoints
- `platform/client/src/app/unsubscribe/page.tsx` — unsubscribe UI
- `platform/client/src/components/layout/LayoutWrapper.tsx` — public route list
