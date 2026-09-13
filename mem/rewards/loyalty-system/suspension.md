---
name: Loyalty Awards Suspension Switch
description: Automatic loyalty-point awards are suspended from 13 Sep 2026 via the loyalty_awards system setting
type: feature
---
Management suspended automatic loyalty-point awards with immediate effect (13 Sep 2026, indefinite).

- Switch: `system_settings.setting_key = 'loyalty_awards'` -> `{"suspended": true}`; helper `public.loyalty_awards_suspended()`.
- `award_activity_reward(uuid,text,jsonb)` and `award_approval_reward(uuid,text,text)` are thin wrappers that return `{success:false, suspended:true, reward_given:0}` while suspended; the original logic lives in `*_impl` (unchanged, not publicly executable).
- Existing loyalty balances, ledger entries and history are preserved — never delete them.
- Salaries, allowances, reimbursements, bonuses and other authorised wallet transactions are unaffected.
- To resume: set `suspended` to false in that setting (no code change needed).
