UPDATE withdrawal_requests 
SET payout_status = 'sent',
    payout_ref = '65f317311dbc59ef49d2400e4943a735',
    payout_attempted_at = now(),
    payout_error = NULL
WHERE id = 'db6ddf9a-8caa-4c49-ad62-7b47b39a7ec9';

-- Also deduct from GosentePay tracked balance
UPDATE gosentepay_balance 
SET balance = balance - 22000,
    last_updated_by = 'System (Manual Payout)',
    last_transaction_ref = '65f317311dbc59ef49d2400e4943a735',
    last_transaction_type = 'payout_deduction',
    updated_at = now();