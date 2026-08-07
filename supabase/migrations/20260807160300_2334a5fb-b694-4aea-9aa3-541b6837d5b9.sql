CREATE TABLE public.quality_analysis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number text NOT NULL,
  verification_code text NOT NULL,
  supplier_id uuid,
  supplier_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'supplier',
  coffee_type text,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysed_by text,
  comments text,
  status text NOT NULL DEFAULT 'printed',
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_analysis_forms TO authenticated;
GRANT ALL ON public.quality_analysis_forms TO service_role;

ALTER TABLE public.quality_analysis_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view analysis forms"
ON public.quality_analysis_forms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create analysis forms"
ON public.quality_analysis_forms FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update analysis forms"
ON public.quality_analysis_forms FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE POLICY "Owners can delete analysis forms"
ON public.quality_analysis_forms FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE UNIQUE INDEX idx_quality_analysis_forms_code ON public.quality_analysis_forms(verification_code);
CREATE INDEX idx_quality_analysis_forms_form_number ON public.quality_analysis_forms(form_number);

CREATE TRIGGER update_quality_analysis_forms_updated_at
BEFORE UPDATE ON public.quality_analysis_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quality_analysis_files
  ADD COLUMN IF NOT EXISTS analysis_form_id uuid REFERENCES public.quality_analysis_forms(id) ON DELETE SET NULL;

ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS analysis_file_id uuid REFERENCES public.quality_analysis_files(id) ON DELETE SET NULL;