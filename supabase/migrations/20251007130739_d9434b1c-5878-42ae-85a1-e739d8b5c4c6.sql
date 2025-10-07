-- Restore original quantities in store_records by reversing inventory movements
-- This fixes records that were depleted by the old system

DO $$
DECLARE
  record_row RECORD;
  total_movements NUMERIC;
  original_qty NUMERIC;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all store records with 0 or suspiciously low quantities
  FOR record_row IN 
    SELECT id, batch_number, quantity_kg, quantity_bags
    FROM store_records
    WHERE quantity_kg = 0 OR (quantity_kg < 100 AND quantity_bags > 0)
  LOOP
    -- Get total movements for this record
    SELECT COALESCE(SUM(quantity_kg), 0) INTO total_movements
    FROM inventory_movements
    WHERE coffee_record_id = record_row.id::text;
    
    -- If there are negative movements (sales), reconstruct original
    IF total_movements < 0 THEN
      -- Original = current - movements (movements are negative, so this adds back)
      original_qty := record_row.quantity_kg - total_movements;
      
      -- Update the record with restored original quantity
      UPDATE store_records
      SET 
        quantity_kg = original_qty,
        updated_at = now()
      WHERE id = record_row.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Restored batch %: % kg -> % kg (movements: % kg)', 
        record_row.batch_number, 
        record_row.quantity_kg, 
        original_qty,
        total_movements;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Restoration complete. Updated % records.', updated_count;
END $$;