
-- Table to link EUDR batches to sales transactions
CREATE TABLE public.eudr_batch_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.eudr_batches(id) ON DELETE CASCADE,
  sale_transaction_id UUID NOT NULL REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  kilograms_allocated NUMERIC NOT NULL DEFAULT 0,
  attached_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eudr_batch_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage eudr_batch_sales"
ON public.eudr_batch_sales FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Trigger: after inserting a batch-sale link, deduct from available_kilograms and mark sold if 0
CREATE OR REPLACE FUNCTION public.handle_eudr_batch_sale_attach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining NUMERIC;
BEGIN
  -- Deduct allocated kg from batch
  UPDATE public.eudr_batches
  SET available_kilograms = available_kilograms - NEW.kilograms_allocated,
      updated_at = now()
  WHERE id = NEW.batch_id;

  -- Check remaining
  SELECT available_kilograms INTO remaining
  FROM public.eudr_batches
  WHERE id = NEW.batch_id;

  -- If fully allocated, mark as sold
  IF remaining <= 0 THEN
    UPDATE public.eudr_batches
    SET status = 'sold', available_kilograms = 0, updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eudr_batch_sale_attach
AFTER INSERT ON public.eudr_batch_sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_eudr_batch_sale_attach();

-- Also handle deletion (restore kg)
CREATE OR REPLACE FUNCTION public.handle_eudr_batch_sale_detach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.eudr_batches
  SET available_kilograms = available_kilograms + OLD.kilograms_allocated,
      status = CASE WHEN status = 'sold' THEN 'available' ELSE status END,
      updated_at = now()
  WHERE id = OLD.batch_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_eudr_batch_sale_detach
AFTER DELETE ON public.eudr_batch_sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_eudr_batch_sale_detach();
