CREATE OR REPLACE FUNCTION public.get_employee_display_name(_auth_user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT name FROM public.employees WHERE auth_user_id = _auth_user_id LIMIT 1),
    (SELECT name FROM public.employees WHERE email = (SELECT email FROM auth.users WHERE id = _auth_user_id) LIMIT 1),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = _auth_user_id),
    (SELECT email FROM auth.users WHERE id = _auth_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_display_name(uuid) TO authenticated;