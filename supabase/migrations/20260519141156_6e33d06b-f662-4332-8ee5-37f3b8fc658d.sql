
-- Helper: check granular or legacy Milling permission
CREATE OR REPLACE FUNCTION public.user_has_milling_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE (auth_user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'))
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
      AND (
        role = 'Super Admin'
        OR permissions @> ARRAY['*']::text[]
        OR permissions @> ARRAY['Milling Operations']::text[]
        OR EXISTS (
          SELECT 1 FROM unnest(permissions) p
          WHERE p ILIKE 'Milling%' OR p ILIKE 'Milling:%'
        )
      )
  );
$$;

-- milling_jobs
DROP POLICY IF EXISTS "Milling operations can manage milling jobs" ON public.milling_jobs;
CREATE POLICY "Milling staff can manage milling jobs"
ON public.milling_jobs FOR ALL
USING (public.user_has_milling_access() OR public.is_current_user_admin())
WITH CHECK (public.user_has_milling_access() OR public.is_current_user_admin());

-- milling_customers
DROP POLICY IF EXISTS "Milling operations can manage customers" ON public.milling_customers;
CREATE POLICY "Milling staff can manage customers"
ON public.milling_customers FOR ALL
USING (public.user_has_milling_access() OR public.is_current_user_admin())
WITH CHECK (public.user_has_milling_access() OR public.is_current_user_admin());

-- milling_transactions
DROP POLICY IF EXISTS "Milling staff can insert milling transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Milling ops can update milling transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Milling ops can delete milling transactions" ON public.milling_transactions;

CREATE POLICY "Milling staff can insert milling transactions"
ON public.milling_transactions FOR INSERT
WITH CHECK (public.user_has_milling_access() OR public.is_current_user_admin());

CREATE POLICY "Milling staff can update milling transactions"
ON public.milling_transactions FOR UPDATE
USING (public.user_has_milling_access() OR public.is_current_user_admin());

CREATE POLICY "Milling staff can delete milling transactions"
ON public.milling_transactions FOR DELETE
USING (public.user_has_milling_access() OR public.is_current_user_admin());
