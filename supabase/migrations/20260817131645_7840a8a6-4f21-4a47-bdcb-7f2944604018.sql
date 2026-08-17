CREATE TABLE public.quality_dispatch_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  created_by_name text,
  analysis_number text,
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  truck_serial_number text NOT NULL,
  vehicle_registration text,
  driver_name text,
  destination_buyer text,
  dispatch_location text,
  coffee_type text,
  batch_references text,
  bags_loaded integer DEFAULT 0,
  total_weight_kg numeric DEFAULT 0,
  sample_weight_g numeric,
  moisture_content numeric,
  group1_defects numeric,
  group2_defects numeric,
  below_screen_12 numeric,
  screen_15_plus numeric,
  foreign_matter numeric,
  pods_husks numeric,
  cup_score numeric,
  cup_profile text,
  outturn numeric,
  verdict text DEFAULT 'accepted',
  sampled_by text,
  analysed_by text,
  approved_by text,
  remarks text,
  status text NOT NULL DEFAULT 'saved',
  printed_at timestamptz,
  print_count integer NOT NULL DEFAULT 0,
  eudr_dispatch_report_id uuid REFERENCES public.eudr_dispatch_reports(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_dispatch_analyses TO authenticated;
GRANT ALL ON public.quality_dispatch_analyses TO service_role;

ALTER TABLE public.quality_dispatch_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view dispatch analyses"
ON public.quality_dispatch_analyses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can create dispatch analyses"
ON public.quality_dispatch_analyses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Creator or managers can update dispatch analyses"
ON public.quality_dispatch_analyses FOR UPDATE TO authenticated
USING (created_by = public.current_user_email() OR public.can_manage_quality_assessments())
WITH CHECK (created_by = public.current_user_email() OR public.can_manage_quality_assessments());

CREATE POLICY "Creator or managers can delete dispatch analyses"
ON public.quality_dispatch_analyses FOR DELETE TO authenticated
USING (created_by = public.current_user_email() OR public.can_manage_quality_assessments());

CREATE TRIGGER update_quality_dispatch_analyses_updated_at
BEFORE UPDATE ON public.quality_dispatch_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.eudr_dispatch_reports
  ADD COLUMN IF NOT EXISTS dispatch_analysis_id uuid REFERENCES public.quality_dispatch_analyses(id) ON DELETE SET NULL;

CREATE INDEX idx_qda_dispatch_date ON public.quality_dispatch_analyses(dispatch_date DESC);
CREATE INDEX idx_qda_truck ON public.quality_dispatch_analyses(truck_serial_number);