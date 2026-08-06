
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_sessions TO authenticated;
GRANT ALL ON public.device_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_credentials TO authenticated;
GRANT ALL ON public.biometric_credentials TO service_role;
GRANT SELECT ON public.role_change_audit TO authenticated;
GRANT ALL ON public.role_change_audit TO service_role;

DROP POLICY IF EXISTS "Admins can view all device sessions" ON public.device_sessions;
CREATE POLICY "Admins can view all device sessions"
ON public.device_sessions FOR SELECT TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update all device sessions" ON public.device_sessions;
CREATE POLICY "Admins can update all device sessions"
ON public.device_sessions FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete device sessions" ON public.device_sessions;
CREATE POLICY "Admins can delete device sessions"
ON public.device_sessions FOR DELETE TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can delete own devices" ON public.device_sessions;
CREATE POLICY "Users can delete own devices"
ON public.device_sessions FOR DELETE TO authenticated
USING (lower(user_email) = public.current_user_email());

DROP POLICY IF EXISTS "Admins can view all biometric credentials" ON public.biometric_credentials;
CREATE POLICY "Admins can view all biometric credentials"
ON public.biometric_credentials FOR SELECT TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete biometric credentials" ON public.biometric_credentials;
CREATE POLICY "Admins can delete biometric credentials"
ON public.biometric_credentials FOR DELETE TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins_read_role_audit" ON public.role_change_audit;
CREATE POLICY "admins_read_role_audit"
ON public.role_change_audit FOR SELECT TO authenticated
USING (public.is_current_user_admin() OR public.is_super_admin(auth.uid()));
