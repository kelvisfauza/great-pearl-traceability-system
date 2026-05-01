
-- Helper: get current user's department without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_department()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: is current user an Admin/Administrator (role-based, not permission-based)
CREATE OR REPLACE FUNCTION public.is_current_user_admin_by_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = ANY (ARRAY['Admin','Administrator','Super Admin','Managing Director'])
  );
$$;

-- Replace recursive policies
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
CREATE POLICY "Admins can view all employees"
ON public.employees
FOR SELECT
USING (public.is_current_user_admin_by_role());

DROP POLICY IF EXISTS "Users can view same department employees" ON public.employees;
CREATE POLICY "Users can view same department employees"
ON public.employees
FOR SELECT
USING (department = public.get_current_user_department());
