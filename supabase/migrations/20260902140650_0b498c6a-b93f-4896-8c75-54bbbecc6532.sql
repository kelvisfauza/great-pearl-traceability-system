GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_credentials TO authenticated;
GRANT ALL ON public.face_credentials TO service_role;

DROP POLICY IF EXISTS "Users update own face credential" ON public.face_credentials;
CREATE POLICY "Users update own face credential"
ON public.face_credentials FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);