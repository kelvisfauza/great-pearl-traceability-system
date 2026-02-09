CREATE OR REPLACE FUNCTION sync_unlinked_coffee_to_batches(p_coffee_type TEXT DEFAULT NULL)
RETURNS TABLE(batches_created INT, records_linked INT, total_kg NUMERIC) AS $$
DECLARE
  v_batch_capacity NUMERIC := 5000;
  v_record RECORD;
  v_current_batch_id UUID := NULL;
  v_current_batch_kg NUMERIC := 0;
  v_batch_count INT := 0;
  v_record_count INT := 0;
  v_total_kg NUMERIC := 0;
  v_batch_code TEXT;
  v_prefix TEXT;
  v_next_num INT;
  v_normalized_type TEXT;
BEGIN
  FOR v_record IN
    SELECT cr.id, cr.coffee_type, cr.kilograms, cr.supplier_name, cr.date, cr.created_at
    FROM coffee_records cr
    WHERE cr.status = 'inventory' 
      AND cr.kilograms > 0
      AND (p_coffee_type IS NULL OR LOWER(cr.coffee_type) = LOWER(p_coffee_type))
      AND cr.id NOT IN (SELECT coffee_record_id FROM inventory_batch_sources)
    ORDER BY cr.created_at ASC
  LOOP
    v_normalized_type := INITCAP(LOWER(v_record.coffee_type));
    
    -- Check if we need a new batch
    IF v_current_batch_id IS NULL OR v_current_batch_kg >= v_batch_capacity THEN
      -- Close current batch if exists
      IF v_current_batch_id IS NOT NULL THEN
        UPDATE inventory_batches SET status = 'active' WHERE id = v_current_batch_id;
      END IF;
      
      -- Get next batch number
      v_prefix := UPPER(SUBSTRING(v_normalized_type FROM 1 FOR 3));
      SELECT COALESCE(MAX(
        CASE WHEN bc.batch_code ~ (v_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(bc.batch_code FROM '-B(\d+)$') AS INT) 
        ELSE 0 END
      ), 0) + 1 INTO v_next_num
      FROM inventory_batches bc WHERE bc.batch_code LIKE v_prefix || '-B%';
      
      v_batch_code := v_prefix || '-B' || LPAD(v_next_num::TEXT, 3, '0');
      
      INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms)
      VALUES (v_batch_code, v_normalized_type, COALESCE(v_record.date, CURRENT_DATE)::DATE, 'filling', 0, 0)
      RETURNING id INTO v_current_batch_id;
      
      v_current_batch_kg := 0;
      v_batch_count := v_batch_count + 1;
    END IF;
    
    -- Link record to batch
    INSERT INTO inventory_batch_sources (batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
    VALUES (v_current_batch_id, v_record.id, v_record.kilograms, v_record.supplier_name, COALESCE(v_record.date, CURRENT_DATE)::DATE);
    
    -- Update batch totals
    v_current_batch_kg := v_current_batch_kg + v_record.kilograms;
    UPDATE inventory_batches 
    SET total_kilograms = v_current_batch_kg, 
        remaining_kilograms = v_current_batch_kg,
        status = CASE WHEN v_current_batch_kg >= v_batch_capacity THEN 'active' ELSE 'filling' END
    WHERE id = v_current_batch_id;
    
    v_record_count := v_record_count + 1;
    v_total_kg := v_total_kg + v_record.kilograms;
  END LOOP;
  
  batches_created := v_batch_count;
  records_linked := v_record_count;
  total_kg := v_total_kg;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;