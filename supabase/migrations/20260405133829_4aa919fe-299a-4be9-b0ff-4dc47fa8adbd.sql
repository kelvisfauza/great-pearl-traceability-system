INSERT INTO storage.buckets (id, name, public) 
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload loan docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'loan-documents');
CREATE POLICY "Authenticated users can read loan docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'loan-documents');