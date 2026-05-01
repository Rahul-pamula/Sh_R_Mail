# Phase 10 — Advanced Campaigns

> **Status:** Not started (design/architecture only)  
> **Last Reviewed:** March 15, 2026

## Goal
Add multi-variant and automated campaign capabilities without regressing deliverability or existing orchestration.

## Feature slices
- **A/B Testing (subject/body variants)**
  - Store variants (A, B, …) per campaign with weights and optional “auto-pick winner after N hours by metric X”.
  - Metrics: open rate (default), click rate, conversion (later via webhooks/events).
- **Drip / Sequence Engine**
  - Define ordered steps with delays (e.g., Day 0 send template A, Day 3 send template B to unopened, etc.).
  - Per-contact state machine: pending → scheduled → sent → opened/clicked → completed/cancelled.
- **Automation Triggers (future)**
  - Rule: on contact_joined_list / tag_added / webhook_event → enqueue sequence.

## Data model (proposed)
- `campaign_variants(id, campaign_id, name, weight, subject, html, text)`
- `campaign_variant_results(campaign_id, variant_id, opens, clicks, sends)` (or derive from `email_events` with variant_id on dispatch)
- `campaign_sequences(id, campaign_id, step_index, delay_hours, template_id, filter_json)`
- `campaign_sequence_state(id, sequence_id, contact_id, status, scheduled_at, dispatched_at, completed_at)`
- Extend `campaign_dispatch` with `variant_id`, `sequence_id` nullable.

## Backend plan
- API to create A/B variants: POST `/campaigns/{id}/variants` (validate weights sum to 100, at least 2 variants).
- Dispatch: sampling by weight → write `variant_id` on `campaign_dispatch` rows.
- Winner selection: cron or scheduler checks after threshold window; updates campaign to “variant_winner_id” and routes remaining sends to winner.
- Sequences: POST `/campaigns/{id}/sequences` to define steps; worker schedules follow-ups by inserting `campaign_dispatch` with `sequence_id` and scheduled time.
- Stop/Cancel: cancelling a campaign cancels future sequence steps.

## Worker plan
- Honor `variant_id` when generating content (render variant body/subject per dispatch).
- Sequence step scheduler: periodic job scans `campaign_sequence_state` for due steps and enqueues dispatch rows.
- Re-entry protection: prevent duplicate sequence enrollment per contact per campaign.

## Analytics
- Add `variant_id` to `email_events` to segment opens/clicks by variant.
- Winner calc: open_rate = unique_opens / delivered; click_rate similarly; tie-breaker by delivered count.

## Risks / mitigations
- Winner bias from bots → continue to exclude `is_bot=true` events.
- Weight drift if scheduler retried → keep deterministic sampling using seeded RNG on dispatch_id.
- Sequence explosions → cap max steps (e.g., 10) and enforce per-tenant daily send limits (Phase 7).

## Acceptance checklist (Phase 10)
- Create/update/delete variants via API and UI; weights validated.
- Dispatch writes `variant_id` and worker renders correct subject/body.
- Winner auto-selection after window; remaining sends route to winner.
- Sequences: define steps, enroll contacts, dispatch scheduled steps, support cancel/pause.
- Analytics: variant-level open/click metrics visible in campaign analytics.

---
## Technical Appendix (Engineering view)
- Planned: A/B variants, drip sequences.
- Proposed tables: campaign_variants, campaign_sequences, campaign_sequence_state; add variant_id/sequence_id to campaign_dispatch.
- Worker: render by variant_id; scheduler for sequence steps; deterministic sampling seeded by dispatch_id.
- Analytics: variant-level metrics using email_events (is_bot=false).
