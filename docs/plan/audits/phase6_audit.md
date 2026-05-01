# Phase 6 — Analytics & Engagement Tracking: Technical Audit

> Audit date: March 23, 2026 (updated)
> Status: ✅ Complete (with corrections applied March 23, 2026)

## What is verified working

### Tracking integrity
- `/track/open/{dispatch_id}` enforces HMAC signatures (`TRACKING_SECRET`), rejects forged payloads (400), and records `email_events`
- Open tracking pixel is injected into every email at dispatch time by the worker
- Click tracking is intentionally disabled (saves Supabase Edge Function invocations)
- Bounces are captured natively via SES webhooks directly to the backend

### Unsubscribe event logging (fixed 2026-03-23)
- Unsubscribing now correctly logs an `unsubscribe` event row into `email_events`
- Previously, the `tenant_id` was not passed to the insert, causing Supabase RLS to silently reject the event — the `email_events` table showed 0 unsubscribes even after real unsubscriptions
- `tenant_id` is now correctly retrieved from the contact record and passed to `_record_unsubscribe_event`

### Analytics stat cards — live-status Unsubscribes count (fixed 2026-03-23)
- The Unsubscribes stat card now cross-checks each unsubscribed contact's current live status before counting
- If a contact re-subscribes, their status becomes `"subscribed"` and they no longer count toward the campaign's Unsubscribes total
- Previously, the count was based purely on historical event log — re-subscribing did not reduce the count

### Analytics Recipient Activity — Unsubscribed column (fixed 2026-03-23)
- The "Unsubscribed" column in the Recipient Activity table now reflects live contact status
- A contact who re-subscribes will show "Unsubscribed: No" immediately after re-subscribing
- Previously, the column was `"unsubscribe" in event_types` — permanent once set, regardless of re-subscription

### Suppression list API (fixed 2026-03-23)
- `GET /contacts/suppression` was colliding with `GET /contacts/{contact_id}` in the FastAPI router
- Fixed by reordering the routes — `/suppression` is now declared before the dynamic `/{contact_id}` route
- Previously the route returned a 500 error on every request, so the Suppression List page never loaded
- Additionally: the `get_suppressed_contacts` handler was missing the `jwt_payload` dependency injection, causing the `apply_data_isolation` call inside `ContactService.get_suppression_list` to crash silently and return 0 results. This is now fixed.

### Source attribution
- `email_events` stores `source` field: `gmail_proxy`, `apple_mpp`, `outlook_proxy`, `yahoo_proxy`, `scanner`, `honeypot`, `human`
- Analytics API aggregates by source and returns a breakdown in the campaign analytics response
- Gmail Proxy opens are counted as genuine opens — this is correct; Gmail Image Proxy downloads the tracking pixel on behalf of the real user as a privacy feature

### Human-filtered toggle removed (2026-03-23)
- The "Human-filtered vs. All signals" toggle was removed from the analytics UI
- The backend already integrated all signals into the main metrics correctly
- The toggle was unnecessary UI complexity and has been removed

### Data model
- `email_events` table (migration 012) includes `tenant_id, campaign_id, dispatch_id, contact_id, event_type, source, ip_address, user_agent, is_bot, created_at`
- Indexed on `campaign_id`, `dispatch_id`, `event_type`, `created_at`

## File pointers
- Supabase Edge Function: `supabase/functions/track/index.ts`
- Analytics API: `platform/api/routes/analytics.py`
- Unsubscribe route: `platform/api/routes/unsubscribe.py`
- Contacts route: `platform/api/routes/contacts.py`
- UI: `platform/client/src/app/campaigns/[id]/analytics/page.tsx`
- Migration: `migrations/012_email_events.sql`
