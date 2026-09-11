---
name: Treasury Pool & Accounts
description: Multi-account treasury (General, User Wallets, Loans, Invest & Earn, Profits, Loyalty fund, Operations, Fees) — block-and-alert when empty, Super Admin funds/moves, hourly Yo+Gosente drift check
type: feature
---
**Accounts** (`treasury_accounts`, codes): `general`, `loyalty_fund`, `operations`, `loans_overdrafts`, `invest_earn`, `profits`, `fees_income`, `user_wallets` (liability).
Every `ledger_entries` credit/debit is auto-posted to its account by trigger (`treasury_resolve_account` maps source_category/entry_type/metadata):
- Salaries, bonuses, allowances, per diem, overtime → General
- Loyalty/activity rewards → Loyalty fund
- Meal plans, providers, requisitions → Operations (GRN/supplier payments excluded)
- Loan/overdraft payouts → Loans; repayments return there; interest/penalties/fees → Profits
- Investment lock → Invest & Earn; principal payout from Invest & Earn, interest from Profits
- Withdrawal/service fees → Fees income

**Rules**: if an account lacks funds the ledger insert raises `TREASURY_INSUFFICIENT` (payment blocked, never negative) and a `treasury_alerts` row is logged. User Wallets opened at wallet-history total; others at 0. Only Super Admin (`treasury_is_super_admin`) can `treasury_fund_account`, `treasury_move_funds`, `treasury_set_threshold`. Admins read via `get_treasury_accounts_overview`.

**Monitor**: `treasury-monitor` edge function runs hourly (pg_cron): syncs Yo float, flags empty/low accounts, compares Yo+GosentePay vs account total (drift threshold `system_settings.treasury_drift_threshold`, default 50,000), emails+SMS Super Admin (`messageType: treasury_alert`), auto-resolves healthy alerts.

UI: `/admin/treasury` → `TreasuryAccountsPanel` above the legacy single pool (`treasury_pool_balance/entries`, still maintained).
