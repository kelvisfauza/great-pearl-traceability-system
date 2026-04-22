CREATE OR REPLACE FUNCTION public.get_public_employee_profile(_lookup text)
RETURNS TABLE (
  emp_name text,
  emp_position text,
  emp_department text,
  emp_employee_id text,
  emp_phone text,
  emp_email text,
  emp_join_date timestamptz,
  emp_status text,
  emp_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.name, e.position, e.department, e.employee_id,
         e.phone, e.email, e.join_date::timestamptz, e.status, e.avatar_url
  FROM public.employees e
  WHERE (e.id::text = _lookup OR e.employee_id = _lookup)
    AND COALESCE(e.disabled, false) = false
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_employee_profile(text) TO anon, authenticated;