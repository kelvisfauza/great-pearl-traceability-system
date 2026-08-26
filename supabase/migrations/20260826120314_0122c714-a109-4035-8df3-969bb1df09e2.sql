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
  ORDER BY e.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_payment_assignees() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_payment_assignees() TO service_role;