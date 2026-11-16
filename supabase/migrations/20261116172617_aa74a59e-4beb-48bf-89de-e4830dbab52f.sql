REVOKE EXECUTE ON FUNCTION public.v3_next_number(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v3_next_number(text, text, text) TO service_role;