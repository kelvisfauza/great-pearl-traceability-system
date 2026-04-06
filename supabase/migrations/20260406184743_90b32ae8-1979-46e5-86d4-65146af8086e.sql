CREATE OR REPLACE FUNCTION public.get_auth_users_by_emails(emails text[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE au.email = ANY(emails);
$$;