-- Create a function to move assessed records to inventory and rebuild batches
CREATE OR REPLACE FUNCTION public.promote_assessed_to_inventory()
RETURNS TABLE(records_updated int, batches_created int, records_linked int, total_kg numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
  v_batches int;
  v_linked int;
  v_kg numeric;
BEGIN
  -- Move assessed records to inventory
  UPDATE coffee_records SET status = 'inventory', updated_at = now()
  WHERE status = 'assessed' AND kilograms > 0;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Rebuild batches to include the newly promoted records
  SELECT rb.batches_created, rb.records_linked, rb.total_kg
  INTO v_batches, v_linked, v_kg
  FROM rebuild_inventory_batches() rb;

  -- Re-apply sales deductions
  PERFORM bulk_deduct_unprocessed_sales();

  RETURN QUERY SELECT v_updated, v_batches, v_linked, v_kg;
END;
$$;