CREATE OR REPLACE FUNCTION public.get_chat_participants_info(_user_ids uuid[])
RETURNS TABLE(auth_user_id uuid, name text, email text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Prefer employee record
  SELECT e.auth_user_id, e.name, e.email, e.avatar_url
  FROM public.employees e
  WHERE e.auth_user_id = ANY(_user_ids)
    AND auth.uid() IS NOT NULL

  UNION ALL

  -- Fallback to auth.users for ids without an employee row
  SELECT u.id AS auth_user_id,
         COALESCE(
           NULLIF(u.raw_user_meta_data->>'full_name',''),
           NULLIF(u.raw_user_meta_data->>'name',''),
           NULLIF(u.raw_user_meta_data->>'display_name',''),
           split_part(u.email, '@', 1),
           'Member'
         ) AS name,
         COALESCE(u.email, '') AS email,
         NULLIF(u.raw_user_meta_data->>'avatar_url','') AS avatar_url
  FROM auth.users u
  WHERE u.id = ANY(_user_ids)
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.employees e2 WHERE e2.auth_user_id = u.id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_participants_info(uuid[]) TO authenticated, anon;