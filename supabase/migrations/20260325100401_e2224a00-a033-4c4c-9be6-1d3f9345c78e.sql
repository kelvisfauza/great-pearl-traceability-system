-- Recalculate remaining_kilograms for every batch based on actual sales records
UPDATE inventory_batches ib
SET 
  remaining_kilograms = GREATEST(0, ib.total_kilograms - COALESCE(
    (SELECT SUM(ibs.kilograms_deducted) 
     FROM inventory_batch_sales ibs 
     WHERE ibs.batch_id = ib.id), 0
  )),
  status = CASE 
    WHEN GREATEST(0, ib.total_kilograms - COALESCE(
      (SELECT SUM(ibs.kilograms_deducted) 
       FROM inventory_batch_sales ibs 
       WHERE ibs.batch_id = ib.id), 0
    )) = 0 THEN 'sold_out'
    ELSE 'active'
  END,
  sold_out_at = CASE 
    WHEN GREATEST(0, ib.total_kilograms - COALESCE(
      (SELECT SUM(ibs.kilograms_deducted) 
       FROM inventory_batch_sales ibs 
       WHERE ibs.batch_id = ib.id), 0
    )) = 0 THEN NOW()
    ELSE NULL
  END;