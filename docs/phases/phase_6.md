# Phase 6 — Analytics & Engagement Tracking

> **Status: ✅ Complete**  
> **Last Reviewed:** March 15, 2026

## What ships in this phase
- **Signed tracking pipeline**: `/track/open/{dispatch_id}` and `/track/click` now require HMAC signatures (`TRACKING_SECRET`) matching worker-generated pixels/links. Invalid signatures return 400 and are discarded.
- **Bot & scanner shielding**: honeypot link injection, UA/ip heuristics, and sub-2s click-after-open heuristics all set `is_bot=true` so analytics exclude noise. Honeypot hits are forced to bot.
- **Event storage**: `email_events` table (migration 012) with `tenant_id`, `campaign_id`, `dispatch_id`, `contact_id`, `event_type`, `url`, `ip_address`, `user_agent`, `is_bot`, `created_at` plus indexes on `campaign_id`, `dispatch_id`, `event_type`, `created_at`.
- **Campaign analytics UI**: `/campaigns/[id]/analytics` page surfaces KPIs (delivered/open/click/fail), timeline, and recipient-level events backed by `/analytics/campaigns/{id}` and `/analytics/campaigns/{id}/recipients`.
- **Sender health**: API still present; with bot-filtered events the metrics now reflect humans only.

## Architecture flow
1. Worker wraps every link and injects a tracking pixel + hidden honeypot using `TRACKING_SECRET` HMAC.
2. Tracking endpoints verify signatures, classify bots, persist to `email_events`, and redirect/serve pixel.
3. Analytics API aggregates `email_events` with `is_bot=false` and returns campaign + recipient stats.
4. Frontend page fetches both summary and recipient feeds client-side for a near‑real‑time view.

## Operations notes
- Configure `TRACKING_SECRET` in both worker and API (.env). Rotate via env and restart.
- Retention/indexing: current indexes cover the hot paths; add time‑based partitioning when `email_events` exceeds ~50M rows (monthly partitions on `created_at` by tenant).
- To disable IP/UA capture for privacy-sensitive tenants, stub the fields before insert (future toggle).
