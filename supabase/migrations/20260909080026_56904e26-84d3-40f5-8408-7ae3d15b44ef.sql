CREATE TABLE IF NOT EXISTS public.payment_receipt_prints (
  payment_id uuid PRIMARY KEY,
  receipt_no text,
  batch_number text,
  printed_by_email text,
  print_count integer NOT NULL DEFAULT 1,
  last_printed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payment_receipt_prints TO authenticated;
GRANT ALL ON public.payment_receipt_prints TO service_role;

ALTER TABLE public.payment_receipt_prints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view receipt prints"
  ON public.payment_receipt_prints FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can record receipt prints"
  ON public.payment_receipt_prints FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update receipt prints"
  ON public.payment_receipt_prints FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_payment_receipt_prints_updated_at
  BEFORE UPDATE ON public.payment_receipt_prints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();