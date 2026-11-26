# Payment accounting

- Daily finance reports use a consistent service-only snapshot and unique saved report run; reconstruct treasury period balances from account journals, label current unpaid lists and stale provider observations, and never retry an uncertain email outcome.

- Prepare durable GosentePay receipts before calling the provider; keep accepted bookkeeping failures recoverable without resending or refunding payouts, so payment acceptance cannot be undone by a recording failure.
- Reconcile treasury from a single saved snapshot after a successful Yo refresh; separate drift investigation from funding notices, so stale reads cannot masquerade as verified cash shortages.
- Classify admin account-only debits as ADMIN_ADJUSTMENT even with overdraft funding; the ledger trigger returns them to General rather than treating them as external payouts.- Treasury payout reservations are keyed by reference on the net held amount (debits minus returns), so a retry after a returned failed attempt draws again and each failure returns funds once.

- Microsoft 365 reads, device/account actions, Teams meetings, notices and SharePoint copies go through the admin-only, audited entra-directory edge function; browser code never calls Graph or holds connector keys, and temporary passwords are never logged.

- Meal plan automatic Finance approval runs inside process-provider-submission send_to_finance through the shared evaluateMealAutoApproval rules, with a unique per-day marker, so only one auto-approval per Uganda day can ever claim a payout.
- Small mobile-money wallet withdrawals are auto-reviewed by auto-approve-withdrawal using shared withdrawal-auto-approval rules, then paid through disburse-approval-request with the service key, so wallet debit, charge and failure restoration stay in one payout path.
- Automatic actions (withdrawals, meal plans, Outlook leave reply) and their limits come from system_settings.automation_controls via _shared/automation-controls, clamped to hard bounds; missing values use defaults and failed reads keep money automation OFF, so Settings changes need no code.
