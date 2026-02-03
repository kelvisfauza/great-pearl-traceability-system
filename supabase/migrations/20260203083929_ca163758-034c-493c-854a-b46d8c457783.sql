
-- Create a function to redistribute oversized batches into proper 5-ton batches
CREATE OR REPLACE FUNCTION public.redistribute_oversized_batches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_row RECORD;
  source_row RECORD;
  current_batch_id uuid;
  current_batch_kg numeric := 0;
  next_batch_num integer;
  batch_prefix text;
  new_batch_code text;
  batches_created integer := 0;
  sources_moved integer := 0;
BEGIN
  -- Process each oversized batch
  FOR batch_row IN 
    SELECT id, batch_code, coffee_type, total_kilograms
    FROM inventory_batches
    WHERE total_kilograms > 5000
    ORDER BY coffee_type, created_at
  LOOP
    batch_prefix := UPPER(SUBSTRING(batch_row.coffee_type FROM 1 FOR 3));
    current_batch_id := batch_row.id;
    current_batch_kg := 0;
    
    -- Get next batch number for this prefix
    SELECT COALESCE(MAX(
      CASE 
        WHEN batch_code ~ (batch_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(batch_code FROM batch_prefix || '-B(\d+)$') AS integer)
        ELSE 0
      END
    ), 0) INTO next_batch_num
    FROM inventory_batches;
    
    -- Process each source in this batch (ordered by date)
    FOR source_row IN 
      SELECT id, kilograms, supplier_name, purchase_date, coffee_record_id
      FROM inventory_batch_sources
      WHERE batch_id = batch_row.id
      ORDER BY purchase_date, created_at
    LOOP
      -- If current batch would exceed 5000kg, create a new one
      IF current_batch_kg + source_row.kilograms > 5000 AND current_batch_kg > 0 THEN
        -- Finalize current batch totals
        UPDATE inventory_batches
        SET total_kilograms = current_batch_kg,
            remaining_kilograms = current_batch_kg,
            status = CASE WHEN current_batch_kg >= 5000 THEN 'active' ELSE 'filling' END
        WHERE id = current_batch_id;
        
        -- Create new batch
        next_batch_num := next_batch_num + 1;
        new_batch_code := batch_prefix || '-B' || LPAD(next_batch_num::text, 3, '0');
        
        INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms)
        VALUES (new_batch_code, batch_row.coffee_type, source_row.purchase_date, 'filling', 0, 0)
        RETURNING id INTO current_batch_id;
        
        current_batch_kg := 0;
        batches_created := batches_created + 1;
      END IF;
      
      -- Move source to current batch (if it's a new batch)
      IF current_batch_id != batch_row.id THEN
        UPDATE inventory_batch_sources
        SET batch_id = current_batch_id
        WHERE id = source_row.id;
        sources_moved := sources_moved + 1;
      END IF;
      
      current_batch_kg := current_batch_kg + source_row.kilograms;
    END LOOP;
    
    -- Finalize the last batch
    UPDATE inventory_batches
    SET total_kilograms = current_batch_kg,
        remaining_kilograms = current_batch_kg,
        status = CASE WHEN current_batch_kg >= 5000 THEN 'active' ELSE 'filling' END
    WHERE id = current_batch_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'batches_created', batches_created,
    'sources_moved', sources_moved
  );
END;
$$;

-- Run the redistribution
SELECT redistribute_oversized_batches();

-- Drop the function after use
DROP FUNCTION IF EXISTS redistribute_oversized_batches();