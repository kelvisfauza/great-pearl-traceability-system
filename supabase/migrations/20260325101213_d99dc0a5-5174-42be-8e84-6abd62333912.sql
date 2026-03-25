-- STEP 1: Clean wipe all batch data
DELETE FROM inventory_batch_sales;
DELETE FROM inventory_batch_sources;
DELETE FROM inventory_batches;

-- STEP 2: Rebuild batches from current inventory records only
-- Create a function to do the clean rebuild
CREATE OR REPLACE FUNCTION public.rebuild_inventory_batches()
RETURNS TABLE(batches_created int, records_linked int, total_kg numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_batch_id uuid;
  v_batch_num int := 0;
  v_batches_created int := 0;
  v_records_linked int := 0;
  v_total_kg numeric := 0;
BEGIN
  -- Clear everything first
  DELETE FROM inventory_batch_sales;
  DELETE FROM inventory_batch_sources;
  DELETE FROM inventory_batches;

  -- Loop through each unique coffee_type + date combination
  FOR v_rec IN
    SELECT 
      CASE 
        WHEN lower(coffee_type) = 'arabica' THEN 'Arabica'
        WHEN lower(coffee_type) = 'robusta' THEN 'Robusta'
        ELSE initcap(coffee_type)
      END as normalized_type,
      date::date as batch_date,
      array_agg(id) as record_ids,
      sum(kilograms) as total_kilograms
    FROM coffee_records
    WHERE status = 'inventory'
      AND kilograms > 0
    GROUP BY 1, date::date
    ORDER BY date::date, 1
  LOOP
    v_batch_num := v_batch_num + 1;
    
    -- Create batch
    INSERT INTO inventory_batches (
      batch_code, coffee_type, batch_date, 
      total_kilograms, remaining_kilograms, status
    ) VALUES (
      'B' || lpad(v_batch_num::text, 3, '0') || '-' || v_rec.batch_date::text || '-' || upper(left(v_rec.normalized_type, 3)),
      v_rec.normalized_type,
      v_rec.batch_date,
      v_rec.total_kilograms,
      v_rec.total_kilograms,
      'active'
    ) RETURNING id INTO v_batch_id;
    
    v_batches_created := v_batches_created + 1;

    -- Link all records for this type+date
    INSERT INTO inventory_batch_sources (batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
    SELECT 
      v_batch_id,
      cr.id,
      cr.kilograms,
      cr.supplier_name,
      cr.date
    FROM coffee_records cr
    WHERE cr.id = ANY(v_rec.record_ids);
    
    v_records_linked := v_records_linked + array_length(v_rec.record_ids, 1);
    v_total_kg := v_total_kg + v_rec.total_kilograms;
  END LOOP;

  RETURN QUERY SELECT v_batches_created, v_records_linked, v_total_kg;
END;
$$;

-- Run the rebuild
SELECT * FROM rebuild_inventory_batches();