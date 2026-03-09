-- Switch to CASH and mark as complete since MoMo keeps failing
UPDATE withdrawal_requests 
SET channel = 'CASH',
    payout_status = 'sent',
    payout_error = NULL,
    payout_ref = 'CASH-MANUAL-' || request_ref,
    status = 'approved'
WHERE id = '08ce8d22-68c8-4682-9e22-0c7fe01f0842';