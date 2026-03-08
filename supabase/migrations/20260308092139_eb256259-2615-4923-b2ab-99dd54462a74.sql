-- Fix Kibaba's withdrawal: reset to pending_approval since admin hasn't approved yet
-- Also delete the premature ledger entry
DELETE FROM ledger_entries WHERE reference = 'WITHDRAWAL-8e95b8cb-86b9-4edd-832f-fad6bf73a74a';

UPDATE withdrawal_requests 
SET status = 'pending_approval', 
    approved_at = NULL, 
    processed_at = NULL
WHERE id = '8e95b8cb-86b9-4edd-832f-fad6bf73a74a' 
  AND admin_approved_1_at IS NULL;