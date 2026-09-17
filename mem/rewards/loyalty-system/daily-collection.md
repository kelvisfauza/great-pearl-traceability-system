---
name: Daily Loyalty Collection (8pm payout)
description: Loyalty points are accrued silently all day and credited to wallets once daily at 8pm Kampala with email + SMS confirmation
type: feature
---
From 17 Sep 2026 loyalty awards are restored in **daily** mode (replaces the 13 Sep suspension).

- Switch: `system_settings.loyalty_awards` = `{"suspended": false, "mode": "daily", ...}`; helpers `public.loyalty_award_mode()` ('daily' | 'instant' | 'off') and `public.loyalty_awards_suspended()`.
- `public.loyalty_daily_accruals` holds silently captured points (user_id, activity_type, form_name, amount, metadata, accrual_date Kampala, credited, ledger_reference). Users may read only their own rows.
- `award_activity_reward_impl` keeps all fair-use maths but reads counts/caps from view `public.loyalty_award_events` (pending accruals + legacy non-batch LOYALTY_REWARD ledger rows) and, in daily mode, writes to the accruals table instead of the ledger.
- Trigger `block_reward_entries_when_suspended` on `ledger_entries`: in daily mode it diverts any LOYALTY_REWARD / MEETING_ATTENDANCE_BONUS / HOST_MEETING_BONUS insert into accruals (returns NULL); in 'off' mode it drops them. The 8pm credit is exempt via `metadata->>'daily_batch' = 'true'`.
- `public.credit_daily_loyalty(p_date)` (service_role only) posts one ledger entry per user, reference `LOYALTY-DAILY-<date>-<uid8>`, source_category SYSTEM_AWARD, and marks accruals credited. Idempotent by reference.
- Edge function `daily-loyalty-payout` runs the RPC then sends email template `loyalty-daily-credit` (in NO_SMS_MIRROR_TEMPLATES) plus a dedicated SMS (`messageType: 'loyalty_daily_credit'`, premium type).
- Cron job `daily-loyalty-payout-8pm` at `0 17 * * *` (8pm Kampala).
