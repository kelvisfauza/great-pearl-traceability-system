REVOKE EXECUTE ON FUNCTION public.get_finance_payment_assignees() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_finance_payment_assignees() FROM anon;

CREATE OR REPLACE FUNCTION public.get_finance_payment_assignees()
RETURNS TABLE(
  name text,
  email text,
  job_title text,
  department text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.name,
    lower(trim(e.email)) AS email,
    COALESCE(e.position, e.role) AS job_title,
    e.department
  FROM public.employees e
  WHERE public.is_current_user_admin()
    OR public.user_has_permission('Finance:view')
    OR public.user_has_permission('Finance:create')
    OR public.user_has_permission('Finance:process')
    OR public.user_has_permission('Finance:approve')
  INTERSECT
  SELECT
    e.name,
    lower(trim(e.email)) AS email,
    COALESCE(e.position, e.role) AS job_title,
    e.department
  FROM public.employees e
  WHERE e.name IS NOT NULL
    AND e.email IS NOT NULL
    AND coalesce(e.disabled, false) = false
    AND lower(coalesce(e.status, 'active')) = 'active'
    AND (
      coalesce(e.permissions, ARRAY[]::text[]) @> ARRAY['*']::text[]
      OR coalesce(e.permissions, ARRAY[]::text[]) @> ARRAY['Finance:process']::text[]
      OR coalesce(e.permissions, ARRAY[]::text[]) @> ARRAY['Finance:approve']::text[]
      OR lower(coalesce(e.role, '')) LIKE '%administrator%'
    )
  ORDER BY name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_payment_assignees() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_finance_payment_assignees() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_finance_payment_assignees() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_payment_assignees() TO service_role;