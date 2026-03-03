CREATE OR REPLACE FUNCTION public.get_guarantor_candidates()
RETURNS TABLE(id uuid, name text, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.name, e.email, COALESCE(e.phone, '') as phone
  FROM public.employees e
  WHERE e.status = 'Active'
  ORDER BY e.name;
$$;