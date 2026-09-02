CREATE TABLE public.store_clearance_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_number TEXT,
  clearance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse TEXT,
  destination_buyer TEXT,
  vehicle_registration TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  coffee_type TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_bags NUMERIC NOT NULL DEFAULT 0,
  total_weight_kg NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  released_by TEXT,
  received_by_driver TEXT,
  approved_by TEXT,
  dispatch_report_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_clearance_forms TO authenticated;
GRANT ALL ON public.store_clearance_forms TO service_role;

ALTER TABLE public.store_clearance_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clearance forms" ON public.store_clearance_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create clearance forms" ON public.store_clearance_forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clearance forms" ON public.store_clearance_forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete clearance forms" ON public.store_clearance_forms FOR DELETE TO authenticated USING (public.can_manage_employees());

CREATE TRIGGER store_clearance_forms_updated_at BEFORE UPDATE ON public.store_clearance_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();