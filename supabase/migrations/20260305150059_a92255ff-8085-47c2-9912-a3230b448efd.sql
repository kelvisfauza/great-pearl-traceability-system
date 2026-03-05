
-- Fix Alex's loan that was incorrectly marked completed with paid_amount=0
UPDATE public.loans 
SET status = 'active', 
    paid_amount = 0, 
    remaining_balance = 144000,
    is_defaulted = false
WHERE id = 'd7ef98f0-ee16-4cdb-bfc0-cbf7240ee312'
AND paid_amount = 0
AND status = 'completed';
