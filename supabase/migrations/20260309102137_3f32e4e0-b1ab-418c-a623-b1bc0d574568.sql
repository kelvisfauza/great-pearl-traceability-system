-- Fix the falsely marked 15k withdrawal back to failed
UPDATE withdrawal_requests 
SET payout_status = 'failed', 
    payout_error = 'Provider returned txRef but transaction failed on GosentePay side',
    payout_ref = NULL
WHERE id = '08ce8d22-68c8-4682-9e22-0c7fe01f0842';

-- Restore the GosentePay balance (add back the 15000 that was falsely deducted)
UPDATE gosentepay_balance 
SET balance = balance + 15000,
    last_updated_by = 'manual-correction',
    last_transaction_ref = 'd953985ed322ef5a2db7505dba74d4ab',
    last_transaction_type = 'false_deduction_reversal',
    updated_at = now();

-- Log the correction
INSERT INTO gosentepay_balance_log (previous_balance, new_balance, change_amount, change_type, reference, notes, created_by)
SELECT balance - 15000, balance, 15000, 'false_deduction_reversal', 'd953985ed322ef5a2db7505dba74d4ab', 'Correcting false success - GosentePay confirmed transaction failed', 'system'
FROM gosentepay_balance ORDER BY updated_at DESC LIMIT 1;