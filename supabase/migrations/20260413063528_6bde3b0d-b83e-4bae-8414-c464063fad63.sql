
CREATE OR REPLACE FUNCTION public.handle_eudr_batch_sale_attach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining NUMERIC;
BEGIN
  UPDATE public.eudr_batches
  SET available_kilograms = available_kilograms - NEW.kilograms_allocated,
      updated_at = now()
  WHERE id = NEW.batch_id;

  SELECT available_kilograms INTO remaining
  FROM public.eudr_batches
  WHERE id = NEW.batch_id;

  IF remaining <= 0 THEN
    UPDATE public.eudr_batches
    SET status = 'sold_out', available_kilograms = 0, updated_at = now()
    WHERE id = NEW.batch_id;
  ELSE
    UPDATE public.eudr_batches
    SET status = 'partially_sold', updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;
