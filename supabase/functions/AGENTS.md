# Payment accounting

- HR queues salaries at full net after NSSF/PAYE; Finance releases one salary through a row-locked private routine that credits that full net from General, then debits planned advances from the wallet as separate internal salary_advance_recovery entries back to General (shortfalls use the normal overdraft); loans and overdraft recovery stay with their existing wallet processes. Committed releases wake salary email delivery and bulk salary payouts are disabled.

- Daily finance reports use a consistent service-only snapshot and unique saved report run; summaries count account-journal external legs once, classify provider payments by saved requests, separate investment credits from profit and use balanced classified accounting journals for P&L. Reconstruct period balances, label current unpaid lists and stale provider observations, preserve issued PDFs and never retry uncertain email outcomes.

- Prepare durable GosentePay receipts before calling the provider; keep accepted bookkeeping failures recoverable without resending or refunding payouts, so payment acceptance cannot be undone by a recording failure.
- Reconcile treasury from a single saved snapshot after a successful Yo refresh; separate drift investigation from funding notices, so stale reads cannot masquerade as verified cash shortages.
- Classify admin account-only debits as ADMIN_ADJUSTMENT even with overdraft funding; the ledger trigger returns them to General rather than treating them as external payouts.- Treasury payout reservations are keyed by reference on the net held amount (debits minus returns), so a retry after a returned failed attempt draws again and each failure returns funds once.

- Microsoft 365 reads, device/account actions, Teams meetings, notices and SharePoint copies go through the admin-only, audited entra-directory edge function; browser code never calls Graph or holds connector keys, and temporary passwords are never logged.

- Meal plan automatic Finance approval runs inside process-provider-submission send_to_finance through the shared evaluateMealAutoApproval rules, with a unique per-day marker, so only one auto-approval per Uganda day can ever claim a payout.
- Small mobile-money wallet withdrawals are auto-reviewed by auto-approve-withdrawal using shared withdrawal-auto-approval rules, then paid through disburse-approval-request with the service key, so wallet debit, charge and failure restoration stay in one payout path.
- Automatic actions (withdrawals, meal plans, Outlook leave reply) and their limits come from system_settings.automation_controls via _shared/automation-controls, clamped to hard bounds; missing values use defaults and failed reads keep money automation OFF, so Settings changes need no code.
- Payslip PDFs are emailed as attachments by send-payslip-pdfs from the Operations Microsoft 365 mailbox with Operations always copied, because the noreply email service cannot carry attachments.
- Staff withdrawal-request codes use withdrawal-request-verification for the signed-in employee only, with purpose-specific hashed one-time codes, immediate SMS to the saved phone and email fallback; never generate or compare these codes in the browser or make SMS wait for email.
