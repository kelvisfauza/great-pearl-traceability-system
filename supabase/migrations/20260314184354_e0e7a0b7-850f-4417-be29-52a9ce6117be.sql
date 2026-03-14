-- Fix Timothy's salary advance request to follow Finance-First flow
UPDATE approval_requests 
SET status = 'Pending Finance', 
    approval_stage = 'pending_finance',
    updated_at = now()
WHERE id = '2b4c54fd-4ed5-4b0c-adfd-c498cd745237'
  AND status = 'Pending'
  AND finance_approved = false;