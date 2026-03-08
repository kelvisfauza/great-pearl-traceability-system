-- Fix Morjalia's stuck withdrawal: reset to pending_approval (same bug as Tumwine's)
UPDATE withdrawal_requests 
SET status = 'pending_approval', 
    approved_at = NULL, 
    approved_by = NULL,
    payout_status = NULL,
    updated_at = now()
WHERE id = '270d207b-3eeb-4827-921e-8a08274d0071' 
  AND admin_approved_1_at IS NULL;

-- Remove the premature ledger entry if any
DELETE FROM ledger_entries 
WHERE reference = 'WITHDRAWAL-270d207b-3eeb-4827-921e-8a08274d0071';

-- Also fix the older stuck one (8839da9d) which also has admin_approved_1_at=NULL but status=approved
UPDATE withdrawal_requests 
SET status = 'pending_approval', 
    approved_at = NULL, 
    approved_by = NULL,
    payout_status = NULL,
    updated_at = now()
WHERE id = '8839da9d-1288-47dc-ac91-eb2236579c6a' 
  AND admin_approved_1_at IS NULL;

DELETE FROM ledger_entries 
WHERE reference = 'WITHDRAWAL-8839da9d-1288-47dc-ac91-eb2236579c6a';