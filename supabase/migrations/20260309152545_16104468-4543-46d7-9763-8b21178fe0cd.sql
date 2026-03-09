
-- Mark old pre-reconciliation batches as sold_out
UPDATE inventory_batches 
SET status = 'sold_out', remaining_kilograms = 0 
WHERE batch_code IN ('B016-2026-03-06-ARA', 'B017-2026-03-07-ARA')
  AND status = 'active';
