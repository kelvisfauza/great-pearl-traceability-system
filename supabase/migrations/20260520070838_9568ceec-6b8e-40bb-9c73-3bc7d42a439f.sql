
CREATE OR REPLACE FUNCTION public.get_chat_participants_info(_user_ids uuid[])
RETURNS TABLE (auth_user_id uuid, name text, email text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.auth_user_id, e.name, e.email, e.avatar_url
  FROM public.employees e
  WHERE e.auth_user_id = ANY(_user_ids)
    AND (
      -- caller must share at least one conversation with the requested user, OR be the user themselves
      e.auth_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.conversation_participants cp1
        JOIN public.conversation_participants cp2
          ON cp1.conversation_id = cp2.conversation_id
        WHERE cp1.user_id = auth.uid()
          AND cp2.user_id = e.auth_user_id
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_participants_info(uuid[]) TO authenticated;
