## Goal

Replace the current "OD draws a positive credit into the wallet" model with a true overdraft: the wallet itself goes negative when a transfer exceeds the balance. Daily interest accrues on the negative amount. Every incoming credit is fully absorbed until the wallet returns to zero.

## How it will behave

1. **Sending more than you have**
   - User has 1,935,905, sends 2,080,000.
   - Wallet posts a single `−2,080,000` WITHDRAWAL → running balance becomes `−144,095`.
   - System checks active overdraft account, verifies `144,095` is within available limit.
   - System posts a one-time **2.75% access fee** = `−3,963` as a FEE ledger entry → wallet now `−148,058`.
   - `overdraft_accounts.outstanding_balance` is set to the absolute value of the negative wallet balance so admin views still reflect the debt.
   - Confirmation email: "Overdraft used UGX 144,095, access fee UGX 3,963, current debt UGX 148,058."

2. **Trying to send while already negative or with no OD facility**
   - Blocked at the edge function with a clear error. No phantom draw entries.

3. **Daily interest (0.6%)**
   - Cron runs once a day at 00:05 Africa/Kampala.
   - For every wallet whose computed balance is `< 0`, post an INTEREST ledger entry of `round(abs(balance) * 0.006)` with `source_category = 'OVERDRAFT_INTEREST'`.
   - Logs to `overdraft_transactions` as `type='interest'` for the admin trail.

4. **Auto-absorb on credits**
   - A trigger on `ledger_entries` fires on every positive entry (deposits, loyalty, refunds, salary, etc.) **except** those tagged `OVERDRAFT_INTEREST` / `OVERDRAFT_FEE` / `OVERDRAFT_ABSORB`.
   - If the wallet's running balance is still `< 0` after the credit posts, the trigger leaves the credit alone — the negative simply moves toward zero naturally (since balance = sum of entries).
   - The trigger updates `overdraft_accounts.outstanding_balance = greatest(0, -wallet_balance)` and, when the balance crosses back to `≥ 0`, marks the OD draw as `recovered` and emails the user: "Overdraft cleared."
   - No separate "absorb" entry is needed — the math already works because the wallet is a true ledger sum.

5. **Withdrawal / transfer guard**
   - `validate_withdrawal_balance` is updated: allowed amount = `wallet_balance + available_overdraft` (where `available_overdraft = approved_limit - outstanding_balance`).
   - UI `availableToRequest` shows `max(0, wallet_balance) + available_overdraft` so users see what they can actually send.

## Backend changes

- **Migration**
  - Add `source_category` values used by triggers: `OVERDRAFT_FEE`, `OVERDRAFT_INTEREST` (string-tagged, no enum change required).
  - Add column `overdraft_accounts.daily_interest_rate numeric not null default 0.006`.
  - Add column `overdraft_accounts.last_interest_accrued_on date`.
  - Create function `public.apply_overdraft_to_transfer(p_user_id uuid, p_shortfall numeric)` — posts the 2.75% fee entry, updates `outstanding_balance`, inserts `overdraft_transactions` rows, returns the fee amount.
  - Create function `public.accrue_overdraft_interest()` — loops negative-balance wallets with active OD accounts, posts interest entry, updates `last_interest_accrued_on`.
  - Create trigger `public.tg_overdraft_recovery_sync()` on `ledger_entries AFTER INSERT` — recomputes `outstanding_balance` from the live wallet sum; if it crossed to zero, marks draw recovered + emits a notification row.
  - Rewrite `public.validate_withdrawal_balance(p_user_id, p_amount)` to include available OD headroom.
  - Backfill: zero out any orphaned `OVERDRAFT_DRAW` positive entries from the old model (replace with adjusting entry) so balances reconcile.

- **Edge functions**
  - `send-money` / `wallet-transfer` (whichever performs user-to-user transfers): before posting the withdrawal, if `amount > wallet_balance`, call `apply_overdraft_to_transfer` with the shortfall. If the OD limit can't cover, return error. Then post the full `−amount` withdrawal as one entry.
  - **Delete** `overdraft-draw` (no longer needed) — or keep it as admin-only manual draw that just posts a negative `OVERDRAFT_MANUAL` and the fee.
  - Add scheduled function `overdraft-accrue-interest` (calls the SQL function above). Wire a daily cron via `cron.schedule`.

- **Cron job**
  - `0 5 * * *` UTC → `overdraft-accrue-interest`.

## Frontend changes

- `useUserWallet.ts`: `availableToRequest = max(0, balance) + available_overdraft_headroom` (fetched from `overdraft_accounts`). Show a small "Overdraft available: X" badge.
- Wallet statement renderer: keep chronological order, show interest entries with a distinct icon/label, show running negative balance in red.
- Transfer confirmation modal: if amount > balance, surface "This will use UGX X from your overdraft (2.75% fee = Y, daily interest 0.6%)." before submit.
- Admin OD page (`pages/admin/OverdraftAdmin.tsx`): add a per-user "Days negative" and "Interest accrued this period" column.

## Data cleanup for the existing case

The current statement has the phantom `+144,095 OVERDRAFT_DRAW` from the old flow. The migration will:
- Find paired `(OVERDRAFT_DRAW positive, WITHDRAWAL negative same minute)` entries from before the cutover.
- Replace the pair with a single negative entry equal to the original shortfall, plus a fee entry, so the historical statement reads correctly.

## Out of scope

- No change to GRNs or any non-wallet flows.
- No change to loyalty, salary, or bonus crediting paths beyond the trigger automatically handling absorption.
