-- Credit the deposit that was incorrectly marked as failed
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec',
  'DEPOSIT',
  95000,
  'DEPOSIT-DEP-1776240497666-pvng2p',
  'SELF_DEPOSIT',
  '{"transaction_ref": "DEP-1776240497666-pvng2p", "phone": "256752724165", "currency": "UGX", "provider": "yo_payments", "source": "mobile_money", "manual_credit": true, "reason": "Airtel callback was misclassified as failed - network_ref present"}'::jsonb
);

-- Fix the transaction status
UPDATE mobile_money_transactions 
SET status = 'completed', updated_at = now()
WHERE transaction_ref = 'DEP-1776240497666-pvng2p';