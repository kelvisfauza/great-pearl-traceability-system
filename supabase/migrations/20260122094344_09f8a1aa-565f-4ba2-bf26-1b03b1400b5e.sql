-- Update pending Robusta records from today to inventory status so they appear in sales
UPDATE coffee_records 
SET status = 'inventory', updated_at = now() 
WHERE status = 'pending' 
AND LOWER(coffee_type) LIKE '%robusta%'
AND created_at > '2026-01-22 00:00:00';