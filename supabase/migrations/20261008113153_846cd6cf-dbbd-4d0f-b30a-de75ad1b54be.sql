ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS finance_status text,
  ADD COLUMN IF NOT EXISTS finance_method text,
  ADD COLUMN IF NOT EXISTS finance_reference text,
  ADD COLUMN IF NOT EXISTS finance_paid_by text,
  ADD COLUMN IF NOT EXISTS finance_paid_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_quotation_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'QT-' || to_char(coalesce(NEW.created_at, now()), 'YYMMDD') || '-' || upper(substr(replace(NEW.id::text,'-',''),1,5));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_quotation_reference ON public.quotations;
CREATE TRIGGER trg_quotation_reference BEFORE INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.set_quotation_reference();

UPDATE public.quotations SET reference = 'QT-' || to_char(created_at,'YYMMDD') || '-' || upper(substr(replace(id::text,'-',''),1,5)) WHERE reference IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quotations_reference_key ON public.quotations(reference);