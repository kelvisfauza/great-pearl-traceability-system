## Goal
Make 1,500 UGX/hr the permanent overtime rate, recompute April, surface those records in HR for approval, and let HR choose **Wallet credit** OR **Mobile money (Yo Payments)** when approving — with email + SMS notifications stating where the money went. Emails never show the multiplication factor.

## Changes

### 1. Rate update (1,500 UGX/hr, 100k cap)
- `supabase/functions/calculate-monthly-overtime/index.ts`: `RATE_PER_HOUR = 1500`, `MAX_MONTHLY_PAY = 100000`.
- `src/hooks/useOvertimeAwards.ts`: rate 4000 → 1500, cap 100k (already added).
- `MonthlyOvertimeReview.tsx`: edit cap 60k → 100k.

### 2. Recompute April 2026
Existing April records were calculated at the old rate. Update each row to the new rate (1,500 × ceil(net_minutes/60), capped at 100,000). Reset status to `pending` so HR re-approves with payout method.

### 3. New columns on `monthly_overtime_reviews`
- `payout_method` (`wallet` | `mobile_money`)
- `payout_destination` (phone number or "wallet")
- `payout_status` (`pending` | `paid` | `failed`)
- `paid_at`, `payout_reference`

### 4. New edge function `process-overtime-payout`
Inputs: `reviewId`, `payoutMethod`, `phone?`.
- Mark review `approved` + chosen payout details.
- **Wallet**: insert `ledger_entries` DEPOSIT (with `bypass_treasury_check: true`, source `overtime_reward`) — credits the employee's wallet.
- **Mobile money**: call Yo Payments via shared `yoPayout` (same pattern as `meal-disbursement`); store reference + status; on failure mark `failed`.
- After success, invoke `send-transactional-email` (template `overtime-reward`, no factor breakdown — already stripped) and `send-sms` with a short message stating amount + destination ("credited to wallet" OR "sent to MTN/Airtel 0700…").

### 5. HR UI: Approval dialog
In `MonthlyOvertimeReview.tsx` replace the green check button with an **Approve & Pay** dialog:
- Radio: Wallet credit / Mobile money
- If mobile money: phone input prefilled from `employees.phone`
- Submit → invokes `process-overtime-payout`
- Bulk "Approve All" prompts once for default method (wallet, since safest), then loops per record server-side.

### 6. April summary email to HR
Send a one-off `general-notification` email to **Fauzakusa@greatpearlcoffee.com** (CC operations) listing the 16 employees and their April rewards at 1,500/hr. Sent immediately after the recompute migration runs.

## Notes
- Email template (`overtime-reward.tsx`) already had hours×rate breakdown removed — only the final reward badge shows.
- Yo Payments float currently ~UGX 1.88M; sufficient for full April payout (~UGX 622k). Wallet credits don't touch Yo float.
- SMS allowlist must include `process-overtime-payout` (per SMS Restriction policy) — will be added.
- All notifications CC operations per Ops Oversight policy.

## Out of scope
- Auto-paying without HR approval (kept manual).
- Adjusting historical `overtime_awards` rows (those are separate one-off awards).

Confirm and I'll ship it.