-- Revert already paid/completed requests back to completed status
UPDATE money_requests
SET 
  approval_stage = 'completed',
  status = 'approved',
  admin_approved = true,
  finance_approved = true
WHERE approval_stage = 'pending_admin'
  AND payment_slip_generated = true;

-- For requests that were finance approved but not paid yet, move to pending_finance
UPDATE money_requests
SET 
  approval_stage = 'pending_finance',
  status = 'pending',
  admin_approved = true,
  finance_approved = false
WHERE approval_stage = 'pending_admin'
  AND payment_slip_generated = false
  AND created_at < NOW() - INTERVAL '1 day'; -- Old requests that were in the system before today

-- Show what's left as truly pending admin approval
SELECT id, request_type, amount, approval_stage, status, created_at
FROM money_requests 
WHERE approval_stage = 'pending_admin'
ORDER BY created_at DESC;