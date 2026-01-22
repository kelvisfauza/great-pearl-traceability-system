-- Update assessed and submitted_to_finance records to inventory status
-- These were assessed but stuck due to old workflow status
UPDATE coffee_records 
SET status = 'inventory', updated_at = now() 
WHERE status IN ('assessed', 'submitted_to_finance', 'APPROVED_FOR_FINANCE')
AND status != 'rejected';