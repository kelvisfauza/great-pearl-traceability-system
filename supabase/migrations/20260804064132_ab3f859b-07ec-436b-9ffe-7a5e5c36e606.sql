
CREATE TABLE public.milling_collection_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_name text NOT NULL,
  collector_phone text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  expected_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  allocated_amount numeric NOT NULL DEFAULT 0,
  allocated_count integer NOT NULL DEFAULT 0,
  reference text UNIQUE,
  yo_reference text,
  channel text NOT NULL DEFAULT 'USSD',
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.milling_collection_remittances TO authenticated;
GRANT ALL ON public.milling_collection_remittances TO service_role;

ALTER TABLE public.milling_collection_remittances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view milling remittances"
ON public.milling_collection_remittances FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_milling_remittances_updated_at
BEFORE UPDATE ON public.milling_collection_remittances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.milling_cash_transactions
  ADD COLUMN IF NOT EXISTS remittance_id uuid REFERENCES public.milling_collection_remittances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS collected_by text;

CREATE INDEX IF NOT EXISTS idx_milling_cash_unremitted
  ON public.milling_cash_transactions (date) WHERE remittance_id IS NULL;

-- Total cash collected by the milling manager that has not yet been paid in.
CREATE OR REPLACE FUNCTION public.milling_unremitted_total()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_paid), 0)
  FROM public.milling_cash_transactions
  WHERE remittance_id IS NULL
    AND COALESCE(payment_method, '') NOT ILIKE '%USSD%'
    AND COALESCE(payment_method, '') NOT ILIKE '%Mobile Money%'
    AND COALESCE(payment_method, '') NOT ILIKE '%MoMo%';
$$;

-- Records a remittance and allocates it across the oldest un-remitted cash payments.
CREATE OR REPLACE FUNCTION public.allocate_milling_remittance(
  p_collector_name text,
  p_collector_phone text,
  p_amount numeric,
  p_reference text,
  p_yo_reference text DEFAULT NULL,
  p_channel text DEFAULT 'USSD'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_remaining numeric := COALESCE(p_amount, 0);
  v_allocated numeric := 0;
  v_count integer := 0;
  v_min date;
  v_max date;
  r RECORD;
BEGIN
  SELECT id INTO v_id FROM public.milling_collection_remittances WHERE reference = p_reference;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT MIN(date), MAX(date) INTO v_min, v_max
  FROM public.milling_cash_transactions
  WHERE remittance_id IS NULL
    AND COALESCE(payment_method, '') NOT ILIKE '%USSD%'
    AND COALESCE(payment_method, '') NOT ILIKE '%Mobile Money%'
    AND COALESCE(payment_method, '') NOT ILIKE '%MoMo%';

  INSERT INTO public.milling_collection_remittances (
    collector_name, collector_phone, period_start, period_end,
    expected_amount, amount_paid, reference, yo_reference, channel, status
  ) VALUES (
    p_collector_name, p_collector_phone,
    COALESCE(v_min, CURRENT_DATE), COALESCE(v_max, CURRENT_DATE),
    public.milling_unremitted_total(), COALESCE(p_amount, 0),
    p_reference, p_yo_reference, COALESCE(p_channel, 'USSD'), 'completed'
  ) RETURNING id INTO v_id;

  FOR r IN
    SELECT id, amount_paid
    FROM public.milling_cash_transactions
    WHERE remittance_id IS NULL
      AND COALESCE(payment_method, '') NOT ILIKE '%USSD%'
      AND COALESCE(payment_method, '') NOT ILIKE '%Mobile Money%'
      AND COALESCE(payment_method, '') NOT ILIKE '%MoMo%'
    ORDER BY date ASC, created_at ASC
  LOOP
    EXIT WHEN v_remaining < r.amount_paid OR v_remaining <= 0;
    UPDATE public.milling_cash_transactions
    SET remittance_id = v_id, remitted_at = now()
    WHERE id = r.id;
    v_remaining := v_remaining - r.amount_paid;
    v_allocated := v_allocated + r.amount_paid;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.milling_collection_remittances
  SET allocated_amount = v_allocated, allocated_count = v_count
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

INSERT INTO public.ussd_services (service_key, name, description, is_active, display_order)
VALUES ('6', 'Milling Collections', 'Milling manager pays in collected milling fees', true, 6)
ON CONFLICT DO NOTHING;
