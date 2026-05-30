
-- Fix: restrict profile_pictures uploads to the user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
-- "Enable upload for users on their own profile pictures" already enforces path ownership; keep it.

-- Fix: restrict dispatch-attachments uploads to the uploader's own folder
DROP POLICY IF EXISTS "Authenticated can upload dispatch attachments" ON storage.objects;
CREATE POLICY "Users can upload dispatch attachments to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dispatch-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
