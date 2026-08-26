---
name: Loyalty Per-Action Cap & Smoothing
description: Ceilings, cooldowns and daily count limits that stop loyalty from paying huge single awards or exhausting the monthly cap early
type: feature
---
Effective 26 Aug 2026, `award_activity_reward(uuid, text, jsonb)` (only overload) enforces:
- 3-minute cooldown per (activity_type + form_name) — repeats in that window earn 0.
- Daily count limits per activity type: page_visit/interaction 5, chat 10, voice_call 4, group_meeting 3, departmental_meeting 2, form_submission 8, report_generation 5, transaction 10, task_completion 8, data_entry 10, document_upload 5, other 5.
- Per-action cap: finance ops 600, meetings 500, everything else 250 (finance-ops uplift reduced from x4 to x2, floor 150).
- Absolute daily ceiling = monthly_cap / 22 (~5,454), on top of the remaining-cap/remaining-days budget; finance ops get 1.5x the daily budget but never exceed the absolute ceiling.
- Finance-ops keyword match no longer includes the generic word "finance" (page paths were falsely triggering the uplift).

Monthly cap 120,000 and the August 3x base uplift are unchanged.

Why: high-frequency small actions (data_entry, form_submission) were paying 1,200 each and exhausting the monthly cap within days.
