
-- 1. Harden is_current_user_admin_by_role to exclude disabled/inactive accounts
CREATE OR REPLACE FUNCTION public.is_current_user_admin_by_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = ANY (ARRAY['Admin','Administrator','Super Admin','Managing Director'])
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
  );
$function$;

-- 2. Remove JWT email fallback in user_has_milling_access
CREATE OR REPLACE FUNCTION public.user_has_milling_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
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
$function$;

-- 3. expense_categories — replace JWT email lookup with auth_user_id
DROP POLICY IF EXISTS "Finance users can manage expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Finance users can read expense categories" ON public.expense_categories;

CREATE POLICY "Finance users can read expense categories"
ON public.expense_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.department = ANY (ARRAY['Finance','Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
);

CREATE POLICY "Finance users can manage expense categories"
ON public.expense_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.department = ANY (ARRAY['Finance','Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.department = ANY (ARRAY['Finance','Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
);

-- 4. requisitions — replace auth.email() based policies with auth.uid() lookups
DROP POLICY IF EXISTS "Finance can create requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Finance can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Finance can view all requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can view their created requisitions" ON public.requisitions;

CREATE POLICY "Finance can create requisitions"
ON public.requisitions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role = ANY (ARRAY['finance','finance manager','admin','Admin','Administrator','Super Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
);

CREATE POLICY "Finance can update requisitions"
ON public.requisitions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role = ANY (ARRAY['finance','finance manager','admin','Admin','Administrator','Super Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
);

CREATE POLICY "Finance can view all requisitions"
ON public.requisitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role = ANY (ARRAY['finance','finance manager','admin','Admin','Administrator','Super Admin'])
      AND employees.status = 'Active'
      AND COALESCE(employees.disabled, false) = false
  )
);

CREATE POLICY "Users can view their created requisitions"
ON public.requisitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.id = requisitions.created_by_employee_id
        OR requisitions.created_by_email = e.email
      )
  )
);
