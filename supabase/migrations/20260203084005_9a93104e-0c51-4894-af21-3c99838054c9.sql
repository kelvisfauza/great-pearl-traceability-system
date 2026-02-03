
-- Split oversized individual sources across multiple 5-ton batches
CREATE OR REPLACE FUNCTION public.split_oversized_sources()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row RECORD;
  batch_row RECORD;
  remaining_kg numeric;
  current_batch_id uuid;
  current_batch_kg numeric;
  next_batch_num integer;
  batch_prefix text;
  new_batch_code text;
  kg_to_add numeric;
  sources_split integer := 0;
  batches_created integer := 0;
BEGIN
  -- Process each oversized source (>5000kg)
  FOR source_row IN 
    SELECT ibs.*, ib.coffee_type, ib.batch_date
    FROM inventory_batch_sources ibs
    JOIN inventory_batches ib ON ib.id = ibs.batch_id
    WHERE ibs.kilograms > 5000
    ORDER BY ib.coffee_type, ibs.purchase_date
  LOOP
    batch_prefix := UPPER(SUBSTRING(source_row.coffee_type FROM 1 FOR 3));
    remaining_kg := source_row.kilograms;
    
    -- Get max batch number
    SELECT COALESCE(MAX(
      CASE 
        WHEN batch_code ~ (batch_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(batch_code FROM batch_prefix || '-B(\d+)$') AS integer)
        ELSE 0
      END
    ), 0) INTO next_batch_num
    FROM inventory_batches;
    
    -- Update original source to 5000kg and put in a clean batch
    UPDATE inventory_batch_sources
    SET kilograms = 5000
    WHERE id = source_row.id;
    
    -- Update original batch totals
    UPDATE inventory_batches
    SET total_kilograms = 5000,
        remaining_kilograms = 5000,
        status = 'active'
    WHERE id = source_row.batch_id;
    
    remaining_kg := remaining_kg - 5000;
    
    -- Create new batches for remaining kg
    WHILE remaining_kg > 0 LOOP
      kg_to_add := LEAST(remaining_kg, 5000);
      next_batch_num := next_batch_num + 1;
      new_batch_code := batch_prefix || '-B' || LPAD(next_batch_num::text, 3, '0');
      
      -- Create new batch
      INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms, target_capacity)
      VALUES (new_batch_code, source_row.coffee_type, source_row.purchase_date, 
              CASE WHEN kg_to_add >= 5000 THEN 'active' ELSE 'filling' END,
              kg_to_add, kg_to_add, 5000)
      RETURNING id INTO current_batch_id;
      
      -- Create new source record for this portion
      INSERT INTO inventory_batch_sources (batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
      VALUES (current_batch_id, source_row.coffee_record_id, kg_to_add, source_row.supplier_name, source_row.purchase_date);
      
      remaining_kg := remaining_kg - kg_to_add;
      batches_created := batches_created + 1;
    END LOOP;
    
    sources_split := sources_split + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'sources_split', sources_split,
    'batches_created', batches_created
  );
END;
$$;

-- Run the split
SELECT split_oversized_sources();

-- Drop the function
DROP FUNCTION IF EXISTS split_oversized_sources();