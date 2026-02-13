
-- Create job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  job_applied_for TEXT NOT NULL,
  cv_url TEXT,
  cv_filename TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can manage
CREATE POLICY "Authenticated users can view job applications"
  ON public.job_applications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert job applications"
  ON public.job_applications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update job applications"
  ON public.job_applications FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete job applications"
  ON public.job_applications FOR DELETE TO authenticated USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('job-applications', 'job-applications', true);

CREATE POLICY "Authenticated users can upload CVs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-applications');

CREATE POLICY "Anyone can view CVs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-applications');

CREATE POLICY "Authenticated users can delete CVs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-applications');
