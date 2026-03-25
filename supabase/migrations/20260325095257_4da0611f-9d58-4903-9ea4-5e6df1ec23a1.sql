
-- Create trigger function to auto-deduct inventory on sale completion
CREATE OR REPLACE FUNCTION public.auto_deduct_inventory_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deduction RECORD;
BEGIN
  -- Only process when status changes to 'Completed'
  IF TG_OP = 'INSERT' AND NEW.status = 'Completed' THEN
    -- Deduct from inventory batches using FIFO
    FOR v_deduction IN
      SELECT * FROM deduct_from_inventory_batches(
        NEW.coffee_type,
        NEW.weight,
        NEW.id,
        NEW.customer
      )
    LOOP
      -- Loop processes all deductions
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' 
     AND NEW.status = 'Completed' 
     AND OLD.status IS DISTINCT FROM 'Completed' THEN
    -- Check if already deducted
    IF NOT EXISTS (
      SELECT 1 FROM inventory_batch_sales WHERE sale_transaction_id = NEW.id
    ) THEN
      FOR v_deduction IN
        SELECT * FROM deduct_from_inventory_batches(
          NEW.coffee_type,
          NEW.weight,
          NEW.id,
          NEW.customer
        )
      LOOP
        -- Loop processes all deductions
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory_on_sale ON sales_transactions;
CREATE TRIGGER trg_auto_deduct_inventory_on_sale
  AFTER INSERT OR UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_deduct_inventory_on_sale();
