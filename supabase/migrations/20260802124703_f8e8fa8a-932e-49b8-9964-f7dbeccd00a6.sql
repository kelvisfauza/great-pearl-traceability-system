GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_credentials TO authenticated;
GRANT ALL ON public.biometric_credentials TO service_role;

DROP POLICY IF EXISTS "Users can view own biometric credential" ON public.biometric_credentials;
CREATE POLICY "Users can view own biometric credential"
ON public.biometric_credentials FOR SELECT TO authenticated
USING (lower(email) = public.current_user_email());

DROP POLICY IF EXISTS "Users can insert own biometric credential" ON public.biometric_credentials;
CREATE POLICY "Users can insert own biometric credential"
ON public.biometric_credentials FOR INSERT TO authenticated
WITH CHECK (lower(email) = public.current_user_email());

DROP POLICY IF EXISTS "Users can update own biometric credential" ON public.biometric_credentials;
CREATE POLICY "Users can update own biometric credential"
ON public.biometric_credentials FOR UPDATE TO authenticated
USING (lower(email) = public.current_user_email())
WITH CHECK (lower(email) = public.current_user_email());

DROP POLICY IF EXISTS "Users can delete own biometric credential" ON public.biometric_credentials;
CREATE POLICY "Users can delete own biometric credential"
ON public.biometric_credentials FOR DELETE TO authenticated
USING (lower(email) = public.current_user_email());

CREATE UNIQUE INDEX IF NOT EXISTS biometric_credentials_email_key ON public.biometric_credentials (lower(email));