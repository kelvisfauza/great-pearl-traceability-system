-- Create contract_files table
CREATE TABLE IF NOT EXISTS public.contract_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  our_ref TEXT NOT NULL,
  buyer TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contract_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view contract files"
  ON public.contract_files
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert contract files"
  ON public.contract_files
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contract files"
  ON public.contract_files
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for contracts bucket
CREATE POLICY "Anyone can view contract files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can upload contract files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contract files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');