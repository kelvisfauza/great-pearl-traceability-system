-- Manually credit the 40,000 UGX deposit that was blocked by the webhook secret issue
-- Transaction ref: DEP-1774455268167-is49ww, User: 00b188fc-73fe-4ee7-9fe9-956ab2faa6ec

-- 1. Update mobile_money_transactions to completed
UPDATE mobile_money_transactions 
SET status = 'completed', 
    completed_at = now(),
    provider_response = '{"status":"SUCCESSFUL","amount":41885,"msisdn":"256781121639","customer_reference":"DEP-1774455268167-is49ww","note":"manually_processed_after_callback_fix"}'::jsonb
WHERE transaction_ref = 'DEP-1774455268167-is49ww' AND status = 'pending';

-- 2. Create the ledger entry to credit the wallet
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec',
  'DEPOSIT',
  40000,
  'DEPOSIT-DEP-1774455268167-is49ww',
  '{"transaction_ref":"DEP-1774455268167-is49ww","phone":"256781121639","currency":"UGX","provider":"gosentepay","note":"manually_credited_after_callback_fix"}'::jsonb
);