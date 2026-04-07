-- Recreate the trigger that was missing
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory_on_sale ON public.sales_transactions;

CREATE TRIGGER trg_auto_deduct_inventory_on_sale
  AFTER INSERT OR UPDATE ON public.sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_deduct_inventory_on_sale();