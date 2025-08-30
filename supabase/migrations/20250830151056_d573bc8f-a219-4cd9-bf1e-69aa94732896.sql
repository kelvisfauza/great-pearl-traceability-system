-- Create the report-documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-documents', 
  'report-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the report-documents bucket
CREATE POLICY "Authenticated users can view report documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload report documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update report documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'report-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete report documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'report-documents' AND auth.uid() IS NOT NULL);