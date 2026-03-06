-- Reset the one pending money_request from pending_admin to pending_finance
UPDATE public.money_requests 
SET approval_stage = 'pending_finance', 
    updated_at = now() 
WHERE approval_stage = 'pending_admin' 
  AND status = 'pending';

-- Also reset any approval_requests that might be in old 'Pending' or 'Pending Admin' status to 'Pending Finance'
UPDATE public.approval_requests 
SET status = 'Pending Finance', 
    approval_stage = 'pending_finance',
    updated_at = now() 
WHERE status IN ('Pending', 'Pending Admin', 'Pending Admin Approval') 
  AND finance_approved IS NULL 
  AND admin_approved IS NOT TRUE;

-- Reset any withdrawal_requests that are in pending_approval (waiting for admin) but haven't been finance-approved yet
UPDATE public.withdrawal_requests 
SET status = 'pending_finance', 
    updated_at = now() 
WHERE status = 'pending_approval' 
  AND finance_approved_at IS NULL;