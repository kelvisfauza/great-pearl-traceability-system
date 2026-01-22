-- Revert today's Robusta records back to pending for proper quality assessment workflow
-- These were incorrectly set to 'inventory' bypassing quality assessment
UPDATE coffee_records 
SET status = 'pending', updated_at = now() 
WHERE id IN ('CR-1769068587991', 'CR-1769068528521', 'CR-1769075070830')
AND LOWER(coffee_type) LIKE '%robusta%';