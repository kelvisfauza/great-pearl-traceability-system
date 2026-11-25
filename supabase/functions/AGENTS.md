# Payment accounting

- Prepare durable GosentePay receipts before calling the provider; keep accepted bookkeeping failures recoverable without resending or refunding payouts, so payment acceptance cannot be undone by a recording failure.
- Reconcile treasury from a single saved snapshot after a successful Yo refresh; separate drift investigation from funding notices, so stale reads cannot masquerade as verified cash shortages.
- Classify admin account-only debits as ADMIN_ADJUSTMENT even with overdraft funding; the ledger trigger returns them to General rather than treating them as external payouts.- Treasury payout reservations are keyed by reference on the net held amount (debits minus returns), so a retry after a returned failed attempt draws again and each failure returns funds once.

- Microsoft 365 reads, device/account actions, Teams meetings, notices and SharePoint copies go through the admin-only, audited entra-directory edge function; browser code never calls Graph or holds connector keys, and temporary passwords are never logged.
