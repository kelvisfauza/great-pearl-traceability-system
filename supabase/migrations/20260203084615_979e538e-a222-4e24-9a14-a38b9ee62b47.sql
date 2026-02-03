
-- Drop and recreate function with unique code generation
DROP FUNCTION IF EXISTS merge_filling_batches();

CREATE OR REPLACE FUNCTION public.merge_filling_batches_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coffee_type_row RECORD;
  source_row RECORD;
  target_batch_id uuid := NULL;
  target_batch_kg numeric := 0;
  batch_prefix text;
  new_batch_code text;
  max_batch_num integer;
  merged_count integer := 0;
  filling_batch_ids uuid[];
BEGIN
  -- Process each coffee type
  FOR coffee_type_row IN 
    SELECT DISTINCT coffee_type FROM inventory_batches WHERE status = 'filling'
  LOOP
    batch_prefix := UPPER(SUBSTRING(coffee_type_row.coffee_type FROM 1 FOR 3));
    target_batch_id := NULL;
    target_batch_kg := 0;
    
    -- Get IDs of all filling batches for this type
    SELECT array_agg(id) INTO filling_batch_ids
    FROM inventory_batches 
    WHERE coffee_type = coffee_type_row.coffee_type AND status = 'filling';
    
    -- Get max batch number across ALL batches for this prefix (not just active)
    SELECT COALESCE(MAX(
      CASE WHEN batch_code ~ ('^' || batch_prefix || '-B\d+$') 
           THEN CAST(SUBSTRING(batch_code FROM '-B(\d+)$') AS integer)
           ELSE 0 END
    ), 0) INTO max_batch_num
    FROM inventory_batches;
    
    -- Process all sources from filling batches, ordered by purchase date
    FOR source_row IN 
      SELECT ibs.id, ibs.kilograms, ibs.purchase_date
      FROM inventory_batch_sources ibs
      WHERE ibs.batch_id = ANY(filling_batch_ids)
      ORDER BY ibs.purchase_date, ibs.created_at
    LOOP
      -- Would this exceed 5000kg?
      IF target_batch_id IS NOT NULL AND target_batch_kg + source_row.kilograms > 5000 THEN
        -- Finalize current target batch
        UPDATE inventory_batches
        SET total_kilograms = target_batch_kg,
            remaining_kilograms = target_batch_kg,
            status = 'active'
        WHERE id = target_batch_id;
        
        target_batch_id := NULL;
        target_batch_kg := 0;
      END IF;
      
      -- Create new target batch if needed
      IF target_batch_id IS NULL THEN
        max_batch_num := max_batch_num + 1;
        new_batch_code := batch_prefix || '-B' || LPAD(max_batch_num::text, 3, '0');
        
        INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms, target_capacity)
        VALUES (new_batch_code, coffee_type_row.coffee_type, source_row.purchase_date, 'filling', 0, 0, 5000)
        RETURNING id INTO target_batch_id;
      END IF;
      
      -- Move source to target batch
      UPDATE inventory_batch_sources SET batch_id = target_batch_id WHERE id = source_row.id;
      target_batch_kg := target_batch_kg + source_row.kilograms;
      merged_count := merged_count + 1;
    END LOOP;
    
    -- Finalize last batch
    IF target_batch_id IS NOT NULL THEN
      UPDATE inventory_batches
      SET total_kilograms = target_batch_kg,
          remaining_kilograms = target_batch_kg,
          status = CASE WHEN target_batch_kg >= 5000 THEN 'active' ELSE 'filling' END
      WHERE id = target_batch_id;
    END IF;
    
    -- Delete old empty filling batches
    DELETE FROM inventory_batches 
    WHERE id = ANY(filling_batch_ids) 
      AND id NOT IN (SELECT DISTINCT batch_id FROM inventory_batch_sources);
  END LOOP;
  
  RETURN jsonb_build_object('sources_merged', merged_count);
END;
$$;

SELECT merge_filling_batches_v2();
DROP FUNCTION IF EXISTS merge_filling_batches_v2();