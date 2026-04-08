-- Fix historical records where user cancellations were incorrectly marked as "Withdrawn"
UPDATE public.approval_requests
SET status = 'Cancelled',
    approval_stage = 'cancelled',
    rejection_reason = COALESCE(rejection_reason, 'Cancelled by user')
WHERE status = 'Withdrawn'
  AND type = 'Withdrawal Request';
