
-- Fix the trigger to use 'sold_out' instead of 'sold' to match the check constraint
CREATE OR REPLACE FUNCTION public.fn_eudr_batch_sale_attach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining numeric;
BEGIN
  SELECT available_kilograms - NEW.kilograms_allocated
    INTO remaining
    FROM public.eudr_batches
   WHERE id = NEW.batch_id;

  IF remaining < 0 THEN
    RAISE EXCEPTION 'Not enough available kilograms in batch';
  END IF;

  IF remaining <= 0 THEN
    UPDATE public.eudr_batches
       SET status = 'sold_out', available_kilograms = 0
     WHERE id = NEW.batch_id;
  ELSE
    UPDATE public.eudr_batches
       SET available_kilograms = remaining,
           status = 'partially_sold'
     WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;
