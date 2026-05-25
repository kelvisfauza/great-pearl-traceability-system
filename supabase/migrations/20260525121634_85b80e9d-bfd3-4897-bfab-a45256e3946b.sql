
-- 1. Make contract-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'contract-documents';

-- 2. Replace permissive market-screenshots policies (public role) with authenticated-only
DROP POLICY IF EXISTS "Anyone can view market screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload market screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their screenshots" ON storage.objects;

CREATE POLICY "Authenticated users can view market screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'market-screenshots');

CREATE POLICY "Authenticated users can upload market screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'market-screenshots');

CREATE POLICY "Authenticated users can update market screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'market-screenshots');

CREATE POLICY "Authenticated users can delete market screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'market-screenshots');
