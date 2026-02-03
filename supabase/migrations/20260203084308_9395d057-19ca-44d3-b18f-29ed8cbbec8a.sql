
-- Consolidate incomplete batches: fill each to 5000kg before starting a new one
CREATE OR REPLACE FUNCTION public.consolidate_incomplete_batches()
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
  next_batch_num integer;
  batch_prefix text;
  new_batch_code text;
  batches_created integer := 0;
  sources_moved integer := 0;
  old_batch_ids uuid[];
BEGIN
  -- Process each coffee type separately
  FOR coffee_type_row IN 
    SELECT DISTINCT coffee_type FROM inventory_batches WHERE status IN ('filling', 'active')
  LOOP
    batch_prefix := UPPER(SUBSTRING(coffee_type_row.coffee_type FROM 1 FOR 3));
    current_batch_id := NULL;
    current_batch_kg := 0;
    old_batch_ids := ARRAY[]::uuid[];
    
    -- Get max batch number for this prefix
    SELECT COALESCE(MAX(
      CASE 
        WHEN batch_code ~ (batch_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(batch_code FROM batch_prefix || '-B(\d+)$') AS integer)
        ELSE 0
      END
    ), 0) INTO next_batch_num
    FROM inventory_batches;
    
    -- Get all sources for this coffee type, ordered by date (FIFO)
    FOR source_row IN 
      SELECT ibs.*, ib.id as old_batch_id
      FROM inventory_batch_sources ibs
      JOIN inventory_batches ib ON ib.id = ibs.batch_id
      WHERE ib.coffee_type = coffee_type_row.coffee_type
        AND ib.status IN ('filling', 'active')
      ORDER BY ibs.purchase_date, ibs.created_at
    LOOP
      -- Track old batches for cleanup
      IF NOT source_row.old_batch_id = ANY(old_batch_ids) THEN
        old_batch_ids := array_append(old_batch_ids, source_row.old_batch_id);
      END IF;
      
      -- If adding this source would exceed 5000kg, finalize current batch and create new
      IF current_batch_id IS NOT NULL AND current_batch_kg + source_row.kilograms > 5000 THEN
        -- Update current batch totals
        UPDATE inventory_batches
        SET total_kilograms = current_batch_kg,
            remaining_kilograms = current_batch_kg,
            status = CASE WHEN current_batch_kg >= 5000 THEN 'active' ELSE 'filling' END
        WHERE id = current_batch_id;
        
        current_batch_id := NULL;
        current_batch_kg := 0;
      END IF;
      
      -- Create new batch if needed
      IF current_batch_id IS NULL THEN
        next_batch_num := next_batch_num + 1;
        new_batch_code := batch_prefix || '-B' || LPAD(next_batch_num::text, 3, '0');
        
        INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms, target_capacity)
        VALUES (new_batch_code, coffee_type_row.coffee_type, source_row.purchase_date, 'filling', 0, 0, 5000)
        RETURNING id INTO current_batch_id;
        
        batches_created := batches_created + 1;
      END IF;
      
      -- Move source to current batch
      UPDATE inventory_batch_sources
      SET batch_id = current_batch_id
      WHERE id = source_row.id;
      
      sources_moved := sources_moved + 1;
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
    
    -- Delete old empty batches
    DELETE FROM inventory_batches 
    WHERE id = ANY(old_batch_ids)
      AND id NOT IN (SELECT DISTINCT batch_id FROM inventory_batch_sources);
  END LOOP;
  
  RETURN jsonb_build_object(
    'batches_created', batches_created,
    'sources_moved', sources_moved
  );
END;
$$;

-- Run consolidation
SELECT consolidate_incomplete_batches();

-- Drop function
DROP FUNCTION IF EXISTS consolidate_incomplete_batches();