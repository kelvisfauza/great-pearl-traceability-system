CREATE OR REPLACE FUNCTION public.get_employee_directory()
RETURNS TABLE (
  id uuid,
  auth_user_id uuid,
  name text,
  email text,
  department text,
  job_position text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.auth_user_id, e.name, e.email, e.department, e."position" AS job_position, e.avatar_url
  FROM public.employees e
  WHERE e.status = 'Active'
    AND e.auth_user_id IS NOT NULL
    AND COALESCE(e.disabled, false) = false
  ORDER BY e.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;