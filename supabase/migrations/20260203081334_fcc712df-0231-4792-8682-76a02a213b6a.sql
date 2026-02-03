-- Function to migrate batch numbers to new YYYYMMDD001 format
CREATE OR REPLACE FUNCTION public.migrate_batch_numbers_to_new_format()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  migrated_count INTEGER := 0;
  failed_count INTEGER := 0;
  record_row RECORD;
  new_batch TEXT;
  date_prefix TEXT;
  next_seq INTEGER;
BEGIN
  -- Process coffee_records with old format batch numbers
  FOR record_row IN
    SELECT id, batch_number, COALESCE(date, created_at::date) as record_date
    FROM coffee_records
    WHERE batch_number IS NOT NULL
      AND batch_number !~ '^\d{11}$'
    ORDER BY created_at ASC
  LOOP
    -- Get date prefix YYYYMMDD
    date_prefix := TO_CHAR(record_row.record_date, 'YYYYMMDD');
    
    -- Find next available sequence for this date across all tables
    SELECT COALESCE(MAX(SUBSTRING(batch_number FROM 9)::integer), 0) + 1 INTO next_seq
    FROM (
      SELECT batch_number FROM coffee_records WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
      UNION ALL
      SELECT batch_number FROM store_records WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
      UNION ALL
      SELECT batch_number FROM quality_assessments WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
      UNION ALL
      SELECT batch_number FROM payment_records WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
    ) combined;
    
    new_batch := date_prefix || LPAD(next_seq::text, 3, '0');
    
    -- Update coffee_records
    UPDATE coffee_records SET batch_number = new_batch WHERE id = record_row.id;
    
    -- Also update related tables that reference this batch
    UPDATE quality_assessments SET batch_number = new_batch WHERE batch_number = record_row.batch_number;
    UPDATE payment_records SET batch_number = new_batch WHERE batch_number = record_row.batch_number;
    UPDATE sales_inventory_tracking SET batch_number = new_batch WHERE batch_number = record_row.batch_number;
    UPDATE daily_tasks SET batch_number = new_batch WHERE batch_number = record_row.batch_number;
    UPDATE modification_requests SET batch_number = new_batch WHERE batch_number = record_row.batch_number;
    
    migrated_count := migrated_count + 1;
  END LOOP;

  -- Process store_records with old format batch numbers
  FOR record_row IN
    SELECT id, batch_number, COALESCE(transaction_date, created_at::date) as record_date
    FROM store_records
    WHERE batch_number IS NOT NULL
      AND batch_number !~ '^\d{11}$'
    ORDER BY created_at ASC
  LOOP
    date_prefix := TO_CHAR(record_row.record_date, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(SUBSTRING(batch_number FROM 9)::integer), 0) + 1 INTO next_seq
    FROM (
      SELECT batch_number FROM coffee_records WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
      UNION ALL
      SELECT batch_number FROM store_records WHERE batch_number ~ ('^' || date_prefix || '\d{3}$')
    ) combined;
    
    new_batch := date_prefix || LPAD(next_seq::text, 3, '0');
    
    UPDATE store_records SET batch_number = new_batch WHERE id = record_row.id;
    migrated_count := migrated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'migrated', migrated_count,
    'failed', failed_count
  );
END;
$$;