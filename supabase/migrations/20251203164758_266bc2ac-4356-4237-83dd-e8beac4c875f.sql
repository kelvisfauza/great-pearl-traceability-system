-- Fix user_has_permission to be SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND status = 'Active'
    AND (
      role = 'Super Admin'
      OR permission_name = ANY(permissions)
      OR EXISTS (
        SELECT 1 FROM unnest(permissions) AS p
        WHERE p LIKE permission_name || ':%'
      )
    )
  );
$$;

-- Fix is_current_user_admin to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND status = 'Active'
    AND role IN ('Administrator', 'Super Admin', 'Manager')
  );
$$;