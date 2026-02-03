-- Create function to deduct from inventory batches using FIFO
CREATE OR REPLACE FUNCTION public.deduct_from_inventory_batches(
  p_coffee_type TEXT,
  p_quantity_kg NUMERIC,
  p_sale_id UUID DEFAULT NULL,
  p_customer TEXT DEFAULT NULL
)
RETURNS TABLE(
  batch_id UUID,
  batch_code TEXT,
  deducted_kg NUMERIC
) AS $$
DECLARE
  remaining_to_deduct NUMERIC := p_quantity_kg;
  batch_row RECORD;
  deduct_amount NUMERIC;
BEGIN
  -- Process batches in FIFO order (oldest first by batch_code)
  FOR batch_row IN
    SELECT ib.id, ib.batch_code, ib.remaining_kilograms
    FROM inventory_batches ib
    WHERE LOWER(ib.coffee_type) = LOWER(p_coffee_type)
      AND ib.remaining_kilograms > 0
      AND ib.status IN ('active', 'filling', 'selling')
    ORDER BY ib.batch_code ASC
  LOOP
    EXIT WHEN remaining_to_deduct <= 0;
    
    -- Calculate how much to deduct from this batch
    deduct_amount := LEAST(batch_row.remaining_kilograms, remaining_to_deduct);
    
    -- Update the batch
    UPDATE inventory_batches
    SET 
      remaining_kilograms = remaining_kilograms - deduct_amount,
      status = CASE 
        WHEN remaining_kilograms - deduct_amount <= 0 THEN 'sold_out'
        WHEN status = 'active' OR status = 'filling' THEN 'selling'
        ELSE status
      END,
      sold_out_at = CASE 
        WHEN remaining_kilograms - deduct_amount <= 0 THEN NOW()
        ELSE sold_out_at
      END,
      updated_at = NOW()
    WHERE id = batch_row.id;
    
    -- Record the movement
    INSERT INTO inventory_movements (
      coffee_record_id,
      movement_type,
      quantity_kg,
      reference_type,
      reference_id,
      created_by,
      notes
    ) VALUES (
      batch_row.id::TEXT,
      'SALE',
      -deduct_amount,
      'sale',
      COALESCE(p_sale_id::TEXT, 'manual'),
      'Sales Department',
      'Sale to ' || COALESCE(p_customer, 'customer') || ' from batch ' || batch_row.batch_code
    );
    
    -- Track deduction for return
    batch_id := batch_row.id;
    batch_code := batch_row.batch_code;
    deducted_kg := deduct_amount;
    RETURN NEXT;
    
    remaining_to_deduct := remaining_to_deduct - deduct_amount;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;