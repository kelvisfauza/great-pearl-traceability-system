---
name: Finance Ops Loyalty Boost
description: Finance payment processing and receipt printing earn boosted loyalty rewards (4x weight, 500 floor, 3-day budget draw)
type: feature
---
`award_activity_reward(uuid, text, jsonb)` (the 3-arg version the app actually calls) must stay in sync with the 2-arg version: from 1 Aug 2026 the monthly cap is 120,000 and base weights are tripled.

Finance ops detection: context description/form_name/page matching `paying supplier|supplier payment|payment receipt|grn|finance|payout|disburse`.
For those actions (transaction, report_generation, form_submission, task_completion):
- base weight x4
- minimum reward UGX 500 for transaction/report_generation
- daily budget draw allowance = 3x the normal daily budget
