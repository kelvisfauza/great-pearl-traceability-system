CREATE TABLE IF NOT EXISTS public.dispatch_monitoring_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number text NOT NULL UNIQUE,
  dispatch_date date,
  warehouse text,
  coffee_type text,
  destination_buyer text,
  vehicle_registrations text,
  total_weight_store numeric,
  traceability_confirmed boolean NOT NULL DEFAULT false,
  quality_analysis_attached boolean NOT NULL DEFAULT false,
  trucks jsonb NOT NULL DEFAULT '[]'::jsonb,
  buyer_weight numeric,
  receipt_attached boolean NOT NULL DEFAULT false,
  weight_difference numeric,
  remarks text,
  inputted_by text,
  manager_name text,
  attachment_path text,
  attachment_name text,
  attachment_uploaded_at timestamptz,
  status text NOT NULL DEFAULT 'issued',
  created_by text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.dispatch_monitoring_forms TO authenticated;
GRANT ALL ON public.dispatch_monitoring_forms TO service_role;

ALTER TABLE public.dispatch_monitoring_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dmf_read_authenticated" ON public.dispatch_monitoring_forms;
CREATE POLICY "dmf_read_authenticated" ON public.dispatch_monitoring_forms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dmf_insert_authenticated" ON public.dispatch_monitoring_forms;
CREATE POLICY "dmf_insert_authenticated" ON public.dispatch_monitoring_forms
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "dmf_update_authenticated" ON public.dispatch_monitoring_forms;
CREATE POLICY "dmf_update_authenticated" ON public.dispatch_monitoring_forms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_dispatch_monitoring_form_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := 'GAC-DM-' || to_char(now(), 'YYMM') || '-';
  seq int;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(form_number, '^.*-', ''))::int), 0) + 1
    INTO seq
  FROM public.dispatch_monitoring_forms
  WHERE form_number LIKE prefix || '%';
  RETURN prefix || lpad(seq::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_dispatch_monitoring_form_number() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dmf_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_dmf_updated_at ON public.dispatch_monitoring_forms;
CREATE TRIGGER trg_dmf_updated_at BEFORE UPDATE ON public.dispatch_monitoring_forms
FOR EACH ROW EXECUTE FUNCTION public.dmf_set_updated_at();

ALTER TABLE public.dispatch_monitoring_forms REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_monitoring_forms;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;