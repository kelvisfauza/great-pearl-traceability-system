-- Update all pending Robusta records to inventory status so they appear in sales
UPDATE coffee_records 
SET status = 'inventory', updated_at = now() 
WHERE status = 'pending' 
AND LOWER(coffee_type) LIKE '%robusta%';