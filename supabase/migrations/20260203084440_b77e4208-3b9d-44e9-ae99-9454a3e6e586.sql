
-- Fix batch statuses: only 'active' if >= 5000kg, otherwise 'filling'
UPDATE inventory_batches
SET status = CASE 
  WHEN total_kilograms >= 5000 THEN 'active'
  ELSE 'filling'
END
WHERE status IN ('active', 'filling');

-- Renumber all batches cleanly starting from B001
CREATE OR REPLACE FUNCTION public.renumber_batches_cleanly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coffee_type_row RECORD;
  batch_row RECORD;
  batch_prefix text;
  counter integer;
BEGIN
  FOR coffee_type_row IN 
    SELECT DISTINCT coffee_type FROM inventory_batches
  LOOP
    batch_prefix := UPPER(SUBSTRING(coffee_type_row.coffee_type FROM 1 FOR 3));
    counter := 0;
    
    FOR batch_row IN 
      SELECT id FROM inventory_batches 
      WHERE coffee_type = coffee_type_row.coffee_type
      ORDER BY created_at
    LOOP
      counter := counter + 1;
      UPDATE inventory_batches 
      SET batch_code = batch_prefix || '-B' || LPAD(counter::text, 3, '0')
      WHERE id = batch_row.id;
    END LOOP;
  END LOOP;
END;
$$;

SELECT renumber_batches_cleanly();
DROP FUNCTION IF EXISTS renumber_batches_cleanly();