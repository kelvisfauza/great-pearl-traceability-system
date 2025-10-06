-- Clean up Rogers' orphaned records (already deleted from Firebase, payment still pending)
-- This is a one-time cleanup for the specific issue

DO $$
DECLARE
  rogers_batches TEXT[];
  batch TEXT;
BEGIN
  -- Get all Rogers batch numbers
  SELECT ARRAY_AGG(DISTINCT batch_number) INTO rogers_batches
  FROM coffee_records
  WHERE supplier_name ILIKE '%rogers%';
  
  -- For each batch, check if payment is pending and delete if so
  FOREACH batch IN ARRAY rogers_batches
  LOOP
    -- Check if payment is pending/unpaid
    IF EXISTS (
      SELECT 1 FROM payment_records 
      WHERE batch_number = batch 
      AND status NOT IN ('Paid', 'paid', 'completed', 'Completed', 'Processing', 'Approved')
    ) OR NOT EXISTS (
      SELECT 1 FROM payment_records WHERE batch_number = batch
    ) THEN
      -- Delete from quality_assessments
      DELETE FROM quality_assessments WHERE batch_number = batch;
      
      -- Delete from payment_records
      DELETE FROM payment_records WHERE batch_number = batch;
      
      -- Delete from finance_coffee_lots
      DELETE FROM finance_coffee_lots 
      WHERE coffee_record_id IN (
        SELECT id FROM coffee_records WHERE batch_number = batch
      );
      
      -- Delete from coffee_records
      DELETE FROM coffee_records WHERE batch_number = batch;
      
      RAISE NOTICE 'Deleted orphaned records for batch: %', batch;
    END IF;
  END LOOP;
END $$;