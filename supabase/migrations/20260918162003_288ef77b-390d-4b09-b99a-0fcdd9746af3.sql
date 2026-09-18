CREATE OR REPLACE FUNCTION public.hash_vault_reset_code(p_code text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(p_code, extensions.gen_salt('bf', 10));
$$;

REVOKE ALL ON FUNCTION public.hash_vault_reset_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_vault_reset_code(text) TO service_role;