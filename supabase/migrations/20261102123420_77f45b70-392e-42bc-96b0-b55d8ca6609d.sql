ALTER FUNCTION public.submit_legacy_store_clearance(jsonb) SET SCHEMA store_dispatch_private;
REVOKE ALL ON FUNCTION store_dispatch_private.submit_legacy_store_clearance(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION store_dispatch_private.submit_legacy_store_clearance(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_legacy_store_clearance(p jsonb)
 RETURNS public.store_clearance_forms LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT * FROM store_dispatch_private.submit_legacy_store_clearance(p); $$;
REVOKE ALL ON FUNCTION public.submit_legacy_store_clearance(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_legacy_store_clearance(jsonb) TO authenticated;