
CREATE OR REPLACE FUNCTION public.rejected_paid_to_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.finance_status::text IN ('PAID','POSTED') AND NEW.coffee_record_id IS NOT NULL THEN
    SELECT status INTO v_status FROM public.coffee_records WHERE id = NEW.coffee_record_id;
    IF v_status IS NOT NULL AND UPPER(v_status) LIKE '%REJECT%' THEN
      UPDATE public.coffee_records
      SET status = 'inventory', updated_at = NOW()
      WHERE id = NEW.coffee_record_id;

      BEGIN
        PERFORM public.ensure_inventory_batch_source_for_record(NEW.coffee_record_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rejected_paid_to_inventory ON public.finance_coffee_lots;
CREATE TRIGGER trg_rejected_paid_to_inventory
AFTER INSERT OR UPDATE OF finance_status ON public.finance_coffee_lots
FOR EACH ROW EXECUTE FUNCTION public.rejected_paid_to_inventory();

CREATE OR REPLACE FUNCTION public.inventory_batch_mark_sold_out()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.remaining_kilograms, 0) <= 0 AND COALESCE(NEW.status,'') <> 'sold_out' THEN
    NEW.status := 'sold_out';
    NEW.sold_out_at := COALESCE(NEW.sold_out_at, NOW());
  ELSIF COALESCE(NEW.remaining_kilograms, 0) > 0 AND NEW.status = 'sold_out' THEN
    NEW.status := 'selling';
    NEW.sold_out_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_batch_mark_sold_out ON public.inventory_batches;
CREATE TRIGGER trg_inventory_batch_mark_sold_out
BEFORE INSERT OR UPDATE ON public.inventory_batches
FOR EACH ROW EXECUTE FUNCTION public.inventory_batch_mark_sold_out();
