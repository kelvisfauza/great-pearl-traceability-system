CREATE OR REPLACE FUNCTION bulk_deduct_unprocessed_sales(p_coffee_type TEXT DEFAULT NULL)
RETURNS TABLE(sales_processed INT, total_deducted NUMERIC, sales_short INT) AS $$
DECLARE
  v_sale RECORD;
  v_processed INT := 0;
  v_total_deducted NUMERIC := 0;
  v_short INT := 0;
  v_deduction RECORD;
  v_sale_deducted NUMERIC;
BEGIN
  FOR v_sale IN
    SELECT st.id, st.customer, st.coffee_type, st.weight,
      st.weight - COALESCE((SELECT SUM(ABS(im.quantity_kg)) FROM inventory_movements im WHERE im.reference_id = st.id::text), 0) as remaining
    FROM sales_transactions st
    WHERE (p_coffee_type IS NULL OR LOWER(st.coffee_type) = LOWER(p_coffee_type))
      AND st.weight > COALESCE((SELECT SUM(ABS(im.quantity_kg)) FROM inventory_movements im WHERE im.reference_id = st.id::text), 0)
    ORDER BY st.date ASC, st.created_at ASC
  LOOP
    v_sale_deducted := 0;
    FOR v_deduction IN
      SELECT * FROM deduct_from_inventory_batches(v_sale.coffee_type, v_sale.remaining, v_sale.id, v_sale.customer)
    LOOP
      v_sale_deducted := v_sale_deducted + v_deduction.deducted_kg;
    END LOOP;
    
    v_total_deducted := v_total_deducted + v_sale_deducted;
    v_processed := v_processed + 1;
    
    IF v_sale_deducted < v_sale.remaining THEN
      v_short := v_short + 1;
    END IF;
  END LOOP;
  
  sales_processed := v_processed;
  total_deducted := v_total_deducted;
  sales_short := v_short;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;