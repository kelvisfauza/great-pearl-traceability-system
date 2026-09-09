ALTER TABLE public.quality_sampling_orders ALTER COLUMN order_number DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.set_sampling_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day text;
  v_seq integer;
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    v_day := to_char(timezone('Africa/Kampala', now()), 'YYYYMMDD');
    SELECT COALESCE(MAX((regexp_replace(order_number, '^SO-\d{8}-', ''))::int), 0) + 1
      INTO v_seq
      FROM public.quality_sampling_orders
     WHERE order_number LIKE 'SO-' || v_day || '-%'
       AND order_number ~ ('^SO-' || v_day || '-\d+$');
    NEW.order_number := 'SO-' || v_day || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_sampling_order_number ON public.quality_sampling_orders;
CREATE TRIGGER trg_set_sampling_order_number
BEFORE INSERT ON public.quality_sampling_orders
FOR EACH ROW EXECUTE FUNCTION public.set_sampling_order_number();