
-- 1. login_verification_codes: lock to the user's own row
DROP POLICY IF EXISTS "Allow reading login verification codes" ON public.login_verification_codes;
DROP POLICY IF EXISTS "Allow updating login verification codes" ON public.login_verification_codes;

CREATE POLICY "Users read own verification code"
  ON public.login_verification_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own verification code"
  ON public.login_verification_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. device_sessions: drop open anon read/update, expose via RPC instead
DROP POLICY IF EXISTS "Anon can read for token verification" ON public.device_sessions;
DROP POLICY IF EXISTS "Anon can update for token verification" ON public.device_sessions;

CREATE OR REPLACE FUNCTION public.verify_device_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device record;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('status', 'error');
  END IF;

  SELECT id, token_expires_at, token_used_at, is_trusted
    INTO v_device
  FROM public.device_sessions
  WHERE verification_token = p_token
  LIMIT 1;

  IF v_device.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error');
  END IF;

  IF v_device.is_trusted OR v_device.token_used_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'success');
  END IF;

  IF v_device.token_expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  UPDATE public.device_sessions
     SET is_trusted = true,
         token_used_at = now()
   WHERE id = v_device.id;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.verify_device_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_device_token(text) TO anon, authenticated;

-- 3. sales-documents bucket: restrict
DROP POLICY IF EXISTS "Anyone can upload sales documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view sales documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update sales documents" ON storage.objects;

CREATE POLICY "Sales staff can upload sales documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sales-documents' AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND (
          'Sales & Marketing' = ANY(e.permissions)
          OR e.role IN ('Administrator','Super Admin')
        )
    )
  );

CREATE POLICY "Authenticated users can view sales documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sales-documents');

CREATE POLICY "Sales staff can update sales documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sales-documents' AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND (
          'Sales & Marketing' = ANY(e.permissions)
          OR e.role IN ('Administrator','Super Admin')
        )
    )
  );

CREATE POLICY "Sales staff can delete sales documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sales-documents' AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND (
          'Sales & Marketing' = ANY(e.permissions)
          OR e.role IN ('Administrator','Super Admin')
        )
    )
  );

-- 4. attendance: replace public USING (true) admin-view with role-checked policy
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;

CREATE POLICY "Admins and HR can view all attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    public.user_has_permission('Human Resources')
    OR public.user_has_permission('IT Management')
    OR public.is_current_user_admin()
  );

-- 5. weekly_allowances: drop open USING(true) policies
DROP POLICY IF EXISTS "Users can view their own allowances" ON public.weekly_allowances;
DROP POLICY IF EXISTS "System can manage allowances" ON public.weekly_allowances;

CREATE POLICY "Users view own weekly allowances"
  ON public.weekly_allowances FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    OR public.user_has_permission('Human Resources')
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  );

CREATE POLICY "HR and admins manage weekly allowances"
  ON public.weekly_allowances FOR ALL
  TO authenticated
  USING (
    public.user_has_permission('Human Resources')
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  )
  WITH CHECK (
    public.user_has_permission('Human Resources')
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  );

-- 6. employees: drop blanket authenticated read; existing scoped policies remain
DROP POLICY IF EXISTS "Allow authenticated users to view all employees" ON public.employees;
