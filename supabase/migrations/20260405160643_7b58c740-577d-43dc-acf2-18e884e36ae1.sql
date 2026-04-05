INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('statements', 'statements', true, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own statements" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'statements');

CREATE POLICY "Public read for statements" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'statements');