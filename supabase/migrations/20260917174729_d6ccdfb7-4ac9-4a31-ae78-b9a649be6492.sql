ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS alt_email text;

-- Reagan Muhindo: company email primary, old Gmail stays as alternate login
UPDATE public.employees
SET email = 'muhindoreagan@greatpearlcoffee.com',
    alt_email = 'info.rhiganmuhindo@gmail.com',
    updated_at = now()
WHERE id = 'd3322fa5-a1d8-417f-b14b-005b0e3753c3';

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.employees
  WHERE lower(email) = lower(p_email)
     OR lower(COALESCE(alt_email, '')) = lower(p_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO service_role;