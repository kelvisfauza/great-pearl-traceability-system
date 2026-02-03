
-- Step 1: Delete empty batches first
DELETE FROM inventory_batches 
WHERE id NOT IN (SELECT DISTINCT batch_id FROM inventory_batch_sources);

-- Step 2: Create function with better batch code handling
CREATE OR REPLACE FUNCTION public.consolidate_all_batches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coffee_type_row RECORD;
  source_row RECORD;
  current_batch_id uuid := NULL;
  current_batch_kg numeric := 0;
  batch_prefix text;
  new_batch_code text;
  batch_counter integer;
  total_batches integer := 0;
BEGIN
  -- Process each coffee type separately
  FOR coffee_type_row IN 
    SELECT DISTINCT ib.coffee_type 
    FROM inventory_batches ib
    WHERE EXISTS (SELECT 1 FROM inventory_batch_sources WHERE batch_id = ib.id)
  LOOP
    batch_prefix := UPPER(SUBSTRING(coffee_type_row.coffee_type FROM 1 FOR 3));
    current_batch_id := NULL;
    current_batch_kg := 0;
    
    -- Find highest existing batch number for this prefix
    SELECT COALESCE(MAX(
      CASE 
        WHEN batch_code ~ ('^' || batch_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(batch_code FROM batch_prefix || '-B(\d+)$') AS integer)
        ELSE 0
      END
    ), 0) INTO batch_counter
    FROM inventory_batches;
    
    -- Get all sources for this coffee type, ordered by date (FIFO)
    FOR source_row IN 
      SELECT ibs.id, ibs.kilograms, ibs.purchase_date, ibs.batch_id
      FROM inventory_batch_sources ibs
      JOIN inventory_batches ib ON ib.id = ibs.batch_id
      WHERE ib.coffee_type = coffee_type_row.coffee_type
      ORDER BY ibs.purchase_date, ibs.created_at
    LOOP
      -- If adding this source would exceed 5000kg AND we have something in current batch
      IF current_batch_id IS NOT NULL AND current_batch_kg > 0 AND current_batch_kg + source_row.kilograms > 5000 THEN
        -- Finalize current batch
        UPDATE inventory_batches
        SET total_kilograms = current_batch_kg,
            remaining_kilograms = current_batch_kg,
            status = 'active'
        WHERE id = current_batch_id;
        
        current_batch_id := NULL;
        current_batch_kg := 0;
      END IF;
      
      -- Create new batch if needed
      IF current_batch_id IS NULL THEN
        batch_counter := batch_counter + 1;
        new_batch_code := batch_prefix || '-B' || LPAD(batch_counter::text, 3, '0');
        
        INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms, target_capacity)
        VALUES (new_batch_code, coffee_type_row.coffee_type, source_row.purchase_date, 'filling', 0, 0, 5000)
        RETURNING id INTO current_batch_id;
        
        total_batches := total_batches + 1;
      END IF;
      
      -- Move source to current batch
      UPDATE inventory_batch_sources
      SET batch_id = current_batch_id
      WHERE id = source_row.id;
      
      current_batch_kg := current_batch_kg + source_row.kilograms;
    END LOOP;
    
    -- Finalize last batch for this coffee type
    IF current_batch_id IS NOT NULL THEN
      UPDATE inventory_batches
      SET total_kilograms = current_batch_kg,
          remaining_kilograms = current_batch_kg,
          status = CASE WHEN current_batch_kg >= 5000 THEN 'active' ELSE 'filling' END
      WHERE id = current_batch_id;
    END IF;
  END LOOP;
  
  -- Delete old empty batches
  DELETE FROM inventory_batches 
  WHERE id NOT IN (SELECT DISTINCT batch_id FROM inventory_batch_sources);
  
  RETURN jsonb_build_object('batches_created', total_batches);
END;
$$;

-- Run consolidation
SELECT consolidate_all_batches();

-- Cleanup
DROP FUNCTION IF EXISTS consolidate_all_batches();