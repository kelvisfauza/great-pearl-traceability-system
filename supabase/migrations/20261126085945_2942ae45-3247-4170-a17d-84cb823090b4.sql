ALTER FUNCTION public.approve_salary_run_to_finance(uuid) SET SCHEMA payroll_release_private;
CREATE FUNCTION public.approve_salary_run_to_finance(p_run_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT payroll_release_private.approve_salary_run_to_finance(p_run_id); $$;
REVOKE ALL ON FUNCTION public.approve_salary_run_to_finance(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_salary_run_to_finance(uuid) TO authenticated;