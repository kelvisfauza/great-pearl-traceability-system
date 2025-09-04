-- Ensure sales-documents bucket exists and fix permissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sales-documents', 'sales-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sales documents
CREATE POLICY "Anyone can view sales documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sales-documents');

CREATE POLICY "Anyone can upload sales documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sales-documents');

CREATE POLICY "Anyone can update sales documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sales-documents');

-- Update Kibaba's permissions to include Sales & Marketing
UPDATE public.employees 
SET permissions = permissions || ARRAY['Sales & Marketing']
WHERE email = 'nicholusscottlangz@gmail.com' 
AND NOT ('Sales & Marketing' = ANY(permissions));

-- Update Denis's permissions to include Sales & Marketing  
UPDATE public.employees 
SET permissions = permissions || ARRAY['Sales & Marketing']
WHERE email = 'bwambaledenis8@gmail.com'
AND NOT ('Sales & Marketing' = ANY(permissions));