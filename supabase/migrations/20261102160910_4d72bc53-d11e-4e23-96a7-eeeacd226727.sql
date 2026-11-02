ALTER TYPE public.lot_finance_status ADD VALUE IF NOT EXISTS 'ON_HOLD';

CREATE OR REPLACE FUNCTION public.block_duplicate_coffee_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dup text;
BEGIN
  IF current_setting('app.allow_duplicate_delivery', true) = 'on' OR NEW.supplier_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT batch_number INTO v_dup FROM public.coffee_records
  WHERE supplier_id = NEW.supplier_id AND coffee_type = NEW.coffee_type
    AND kilograms = NEW.kilograms AND bags = NEW.bags
    AND abs(date - NEW.date) <= 3 AND id <> NEW.id
    AND lower(coalesce(status,'')) NOT IN ('deleted','cancelled','quality_rejected','rejected')
  LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate delivery: % already has the same % kg / % bags recorded as batch % within 3 days. Check the paper record before entering it again.',
      NEW.supplier_name, NEW.kilograms, NEW.bags, v_dup USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_duplicate_coffee_delivery ON public.coffee_records;
CREATE TRIGGER trg_block_duplicate_coffee_delivery BEFORE INSERT ON public.coffee_records
FOR EACH ROW EXECUTE FUNCTION public.block_duplicate_coffee_delivery();