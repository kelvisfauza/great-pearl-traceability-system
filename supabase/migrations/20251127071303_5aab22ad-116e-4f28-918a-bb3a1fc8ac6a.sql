-- Update the function to include Quality Control:view permission
CREATE OR REPLACE FUNCTION public.can_manage_quality_assessments()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:view' = ANY(employees.permissions)
      OR 'Quality Control:create' = ANY(employees.permissions)
      OR 'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  );
END;
$$;