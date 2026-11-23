CREATE SCHEMA IF NOT EXISTS meal_document_lookup_private;
REVOKE ALL ON SCHEMA meal_document_lookup_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA meal_document_lookup_private TO authenticated;
ALTER FUNCTION public.lookup_issued_meal_form(text) SET SCHEMA meal_document_lookup_private;
CREATE FUNCTION public.lookup_issued_meal_form(p_number text)
RETURNS TABLE(document_number text,created_at timestamptz,printed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT * FROM meal_document_lookup_private.lookup_issued_meal_form(p_number); $$;
REVOKE ALL ON FUNCTION public.lookup_issued_meal_form(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lookup_issued_meal_form(text) TO authenticated;