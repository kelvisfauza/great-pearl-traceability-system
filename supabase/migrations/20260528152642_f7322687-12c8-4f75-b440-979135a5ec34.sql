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
  SELECT
    e.id,
    e.auth_user_id,
    e.name,
    lower(trim(e.email)) AS email,
    e.department,
    e.position AS job_position,
    e.avatar_url
  FROM public.employees e
  WHERE e.auth_user_id IS NOT NULL
    AND coalesce(e.disabled, false) = false
    AND lower(coalesce(e.status, 'active')) = 'active'
  ORDER BY e.name;
$$;

REVOKE ALL ON FUNCTION public.get_employee_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO service_role;