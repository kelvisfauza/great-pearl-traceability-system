-- Fix ALL claimed vouchers that still show pending status
UPDATE public.christmas_vouchers 
SET status = 'claimed' 
WHERE claimed_at IS NOT NULL AND status = 'pending';