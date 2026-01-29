-- Update all current week's allowances to reflect the new 20,000 limit
-- Add 5,000 to both total_eligible_amount and balance_available for records that still have the old 15,000 limit
UPDATE public.weekly_allowances
SET 
  total_eligible_amount = 20000,
  balance_available = balance_available + 5000,
  updated_at = now()
WHERE week_start_date >= '2025-01-27'
  AND total_eligible_amount = 15000;