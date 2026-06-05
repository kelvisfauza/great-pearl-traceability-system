
# Overdraft v2 — MTN-style Opt-In Overdraft

Rebuild the overdraft so it works like MTN MoKash: members opt in once, then it transparently funds wallet debits when the wallet runs out, accrues daily interest, and auto-recovers from any future credit.

## Chosen parameters
- **Activation:** opt-in (one-tap, no admin approval)
- **Fee:** none (no activation fee)
- **Daily interest:** 0.5% on outstanding balance (~15%/month, between MTN's ~9% and your 2%/day suggestion)
- **30-day freeze:** yes — if outstanding has not cleared for 30 days, new draws blocked until repaid (incoming credits still apply to recovery)

## What changes

### Activation
- Remove the "apply + admin approve" path. Members see their system-assigned monthly limit and a single **Activate Overdraft** button.
- Activation creates an `overdraft_accounts` row with `approved_limit = current month's eligibility` and `status='active'`. No fee.
- Monthly recompute cron also updates each active account's `approved_limit` to the new month's eligibility figure.
- Members can **Deactivate** anytime if outstanding = 0.

### How it gets used (no explicit "draw")
Any wallet debit (instant withdrawal, wallet-to-wallet transfer, loan repayment, USSD pay, service-provider payout, milling pay, etc.) calls a new RPC `consume_spendable(user_id, amount, source, metadata)`:
1. Computes `spendable = wallet_balance + (limit − outstanding)`.
2. If `amount > spendable` → reject as "insufficient funds".
3. Else, debits wallet first; any shortfall is taken from overdraft (increases `outstanding_balance`, logs `overdraft_transactions` row type `draw`).
4. If account is frozen (see below) → reject overdraft portion only; wallet-only debit still allowed.

### Daily interest
- New cron `overdraft-accrue-interest` runs daily at 00:30 UTC.
- For every active account with `outstanding_balance > 0`: `outstanding += round(outstanding * 0.005)`, log a `overdraft_transactions` row `type='interest'`.

### Recovery (unchanged behaviour, kept)
- The existing `trigger_overdraft_recovery` on wallet credits diverts incoming money to clear outstanding (principal + accrued interest) first; remainder lands in wallet.

### 30-day freeze
- New columns: `first_negative_at`, `frozen` on `overdraft_accounts`.
- Set `first_negative_at = now()` when balance goes from 0 → positive outstanding; clear it when it returns to 0.
- Daily cron also flips `frozen = true` when `first_negative_at < now() - 30 days`. New overdraft draws blocked until cleared; recovery still applies and unfreezes on full clearance.

### Monthly recompute (kept, extended)
- 1st of each month at 06:00 UTC: recompute `overdraft_eligibility` AND mirror the new limit into each active `overdraft_accounts.approved_limit`.

## UI changes

### Member Overdraft page (`/overdraft`)
- Drop the Apply dialog and applications history.
- Show three cards: **System Limit** (from eligibility), **Outstanding** (with accrued interest breakdown), **Available** (limit − outstanding).
- **Activate / Deactivate** button.
- Activity table: draws, interest accruals, recoveries.
- Info banner explains: auto-used on debit, 0.5%/day interest, 30-day freeze rule.

### Admin Overdraft page (`/admin/overdraft`)
- Drop pending applications section.
- Show all active accounts with: member, limit, outstanding, frozen flag, days since first overdrawn.
- Manual actions: adjust limit, unfreeze (override), force-close.
- "Recompute all limits" button.

### Wallet/withdrawal/transfer UIs
- Replace "balance" guards with "spendable" (balance + available overdraft). Show a small "incl. UGX X overdraft available" hint when overdraft is active.

## Technical details

### DB migration
- `overdraft_accounts`: add `frozen boolean default false`, `first_negative_at timestamptz`, `last_interest_at timestamptz`.
- `overdraft_transactions`: ensure `transaction_type` allows `'interest'` (it's free-text today, so fine).
- New RPC `public.consume_spendable(p_user_id uuid, p_amount numeric, p_source text, p_metadata jsonb)` returning `{ok, wallet_debit, overdraft_debit, new_outstanding}`.
- New RPC `public.get_overdraft_spendable(p_user_id uuid)` returning `{wallet, limit, outstanding, available, frozen}`.
- Trigger update: when `overdraft_accounts.outstanding_balance` transitions 0→positive set `first_negative_at`; positive→0 clear it and `frozen=false`.

### Edge functions
- New: `overdraft-activate`, `overdraft-deactivate`, `overdraft-accrue-interest` (cron target).
- Modify (call `consume_spendable` instead of raw wallet debit + balance check):
  - `instant-withdrawal`
  - `service-provider-payout`
  - `process-salary-auto-invest`
  - `process-loan-repayments`
  - `ussd-payment-success` (if debits wallet)
  - wallet-to-wallet transfer function
- Delete/disable: `overdraft-apply`, `overdraft-approve`, `overdraft-draw` (kept as no-ops returning error pointing to new flow, to avoid breaking old clients).

### Cron jobs
- Keep `overdraft-recompute-monthly` (1st @ 06:00 UTC), extend to push new limits into active accounts.
- New `overdraft-accrue-interest-daily` (every day @ 00:30 UTC).

### Frontend
- Rewrite `src/pages/Overdraft.tsx` and `src/pages/admin/OverdraftAdmin.tsx`.
- Update `useUnifiedApprovalRequests.ts` and `WithdrawalRequestsManager.tsx` balance guards to use `get_overdraft_spendable`.
- Add a tiny `useSpendableBalance(email)` hook used by withdrawal/transfer forms.

## Rollout
1. Migration (schema + RPCs + trigger).
2. New edge functions + cron.
3. Refactor existing edge functions one by one to use `consume_spendable`.
4. Frontend rewrite + balance-guard updates.
5. Verify with a test activation + small simulated debit.
