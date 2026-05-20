
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Host or admin can read call recordings" ON storage.objects;
CREATE POLICY "Host or admin can read call recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_current_user_admin()
  )
);
