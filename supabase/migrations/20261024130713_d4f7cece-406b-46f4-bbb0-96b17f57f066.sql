CREATE TABLE public.fuel_voucher_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

GRANT SELECT ON public.fuel_voucher_counters TO authenticated;
GRANT ALL ON public.fuel_voucher_counters TO service_role;

ALTER TABLE public.fuel_voucher_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view voucher counters" ON public.fuel_voucher_counters
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_fuel_voucher_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_next integer;
BEGIN
  INSERT INTO public.fuel_voucher_counters (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = fuel_voucher_counters.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'FV-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
END;
$$;

CREATE TABLE public.fuel_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text NOT NULL UNIQUE DEFAULT public.next_fuel_voucher_number(),
  kind text NOT NULL DEFAULT 'trip',
  status text NOT NULL DEFAULT 'issued',
  truck_number text,
  driver_name text,
  driver_phone text,
  service_provider text,
  fuel_type text NOT NULL DEFAULT 'Diesel',
  route text,
  purpose text,
  notes text,
  batch_reference text,
  issued_by_name text,
  issued_by_email text,
  used_at timestamptz,
  used_litres numeric,
  used_amount numeric,
  used_provider text,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.fuel_vouchers TO authenticated;
GRANT ALL ON public.fuel_vouchers TO service_role;

ALTER TABLE public.fuel_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fuel vouchers" ON public.fuel_vouchers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can issue fuel vouchers" ON public.fuel_vouchers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update fuel vouchers" ON public.fuel_vouchers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete fuel vouchers" ON public.fuel_vouchers
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'Super Admin'::public.app_role)
    OR public.has_role(auth.uid(), 'Administrator'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.fuel_vouchers_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fuel_vouchers_updated_at
  BEFORE UPDATE ON public.fuel_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.fuel_vouchers_touch_updated_at();