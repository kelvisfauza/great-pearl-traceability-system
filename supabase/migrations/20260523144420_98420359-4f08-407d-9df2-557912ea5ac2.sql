CREATE OR REPLACE FUNCTION public.get_chat_participants_info(_user_ids uuid[])
RETURNS TABLE(auth_user_id uuid, name text, email text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.auth_user_id, e.name, e.email, e.avatar_url
  FROM public.employees e
  WHERE e.auth_user_id = ANY(_user_ids)
    AND auth.uid() IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_participants_info(uuid[]) TO authenticated, anon;