---
name: Loyalty Per-Action Cap
description: Hard ceiling on a single loyalty award so one action cannot drain the daily budget
type: feature
---
Effective 5 Aug 2026, `award_activity_reward(uuid, text, jsonb)` caps each individual award:
- Finance ops (supplier payment, GRN payout, receipt print): max UGX 1,200, min UGX 300.
- Meetings / calls: max UGX 800.
- Everything else: max UGX 400.

Why: on 5 Aug single transactions paid UGX 9,000+, exhausting the user's daily budget so the rest of the day earned nothing ("system stopped awarding"). Monthly cap 120,000 and the August 3x uplift are unchanged. The duplicate 2-arg overload of the function was dropped — only the 3-arg (context defaults to '{}') exists.
