# Payment accounting

- Prepare durable GosentePay receipts before calling the provider; keep accepted bookkeeping failures recoverable without resending or refunding payouts, so payment acceptance cannot be undone by a recording failure.
- Reconcile treasury from a single saved snapshot after a successful Yo refresh; separate drift investigation from funding notices, so stale reads cannot masquerade as verified cash shortages.