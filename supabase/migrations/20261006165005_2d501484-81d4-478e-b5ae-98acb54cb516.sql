CREATE TABLE public.partial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  payee_name text,
  payee_email text,
  payee_phone text,
  total_amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status text NOT NULL DEFAULT 'part_paid',
  approved_by_name text,
  approved_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);
CREATE TABLE public.partial_payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partial_payment_id uuid NOT NULL REFERENCES public.partial_payments(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL,
  reference text,
  notes text,
  balance_after numeric NOT NULL,
  paid_by_name text,
  paid_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partial_payments TO authenticated;
GRANT SELECT ON public.partial_payment_installments TO authenticated;
GRANT ALL ON public.partial_payments TO service_role;
GRANT ALL ON public.partial_payment_installments TO service_role;
ALTER TABLE public.partial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partial_payment_installments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_track_payments()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(auth.jwt() ->> 'email')
      AND (e.role IN ('Administrator','Super Admin','Finance')
           OR e.department ILIKE '%procurement%'
           OR e.department ILIKE '%finance%')
  )
$$;

CREATE POLICY "Admins, finance and procurement can view partial payments"
ON public.partial_payments FOR SELECT TO authenticated USING (public.can_track_payments());
CREATE POLICY "Admins, finance and procurement can view installments"
ON public.partial_payment_installments FOR SELECT TO authenticated USING (public.can_track_payments());

CREATE OR REPLACE FUNCTION public.partial_payments_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_partial_payments_touch BEFORE UPDATE ON public.partial_payments
FOR EACH ROW EXECUTE FUNCTION public.partial_payments_touch();