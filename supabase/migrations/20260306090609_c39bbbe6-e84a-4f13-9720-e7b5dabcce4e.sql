-- Reset Timothy's withdrawal to pending_approval (Finance already approved, now needs Admin)
-- Keep finance_approved_at intact since Finance did approve it
UPDATE withdrawal_requests 
SET status = 'pending_approval',
    approved_at = NULL,
    approved_by = NULL,
    processed_at = NULL,
    payout_status = 'pending'
WHERE id = 'ea24fbee-3628-484c-b159-5f4ada203f5b';

-- Remove the premature ledger deduction that the trigger created
DELETE FROM ledger_entries 
WHERE reference = 'WITHDRAWAL-ea24fbee-3628-484c-b159-5f4ada203f5b';