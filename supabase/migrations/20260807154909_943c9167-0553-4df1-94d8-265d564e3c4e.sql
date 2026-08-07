CREATE TABLE public.quality_analysis_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NULL,
  supplier_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'supplier',
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  form_number text NULL,
  coffee_type text NULL,
  notes text NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NULL,
  verification_code text NULL,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  uploaded_by_email text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_analysis_files TO authenticated;
GRANT ALL ON public.quality_analysis_files TO service_role;

ALTER TABLE public.quality_analysis_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view quality analysis files"
ON public.quality_analysis_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can add quality analysis files"
ON public.quality_analysis_files FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can update their quality analysis files"
ON public.quality_analysis_files FOR UPDATE TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete their quality analysis files"
ON public.quality_analysis_files FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

CREATE TRIGGER update_quality_analysis_files_updated_at
BEFORE UPDATE ON public.quality_analysis_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff can upload quality analysis files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quality-analysis-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff can view quality analysis files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'quality-analysis-files');

CREATE POLICY "Owners can delete quality analysis files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quality-analysis-files' AND auth.uid()::text = (storage.foldername(name))[1]);