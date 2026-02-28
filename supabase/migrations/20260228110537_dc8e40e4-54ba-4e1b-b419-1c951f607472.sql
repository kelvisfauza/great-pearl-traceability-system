
-- Fix the currently stuck withdrawal that already has 2 admin approvals
UPDATE withdrawal_requests 
SET status = 'pending_finance', updated_at = now() 
WHERE id = '7d388dd6-390d-40db-997c-33ea1a33c3c3' 
AND status = 'pending_admin_3';
