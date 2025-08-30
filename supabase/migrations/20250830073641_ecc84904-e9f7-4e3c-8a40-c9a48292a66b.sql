-- Create storage bucket for report documents
INSERT INTO storage.buckets (id, name, public) VALUES ('report-documents', 'report-documents', false);

-- Create storage policies for report documents
CREATE POLICY "Users can upload report documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-documents');

CREATE POLICY "Users can view report documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-documents');

CREATE POLICY "Users can update their report documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'report-documents');

CREATE POLICY "Users can delete their report documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'report-documents');

-- Add attachment fields to store_reports table
ALTER TABLE store_reports 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_name TEXT,
ADD COLUMN scanner_used TEXT;