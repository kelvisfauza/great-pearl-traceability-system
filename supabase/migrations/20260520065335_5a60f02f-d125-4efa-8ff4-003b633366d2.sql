REVOKE EXECUTE ON FUNCTION public.get_employee_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;