CREATE SCHEMA IF NOT EXISTS grn_print_private;
REVOKE ALL ON SCHEMA grn_print_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA grn_print_private TO authenticated, service_role;
ALTER FUNCTION public.revoke_grn_prints(uuid[],text) SET SCHEMA grn_print_private;
CREATE FUNCTION public.revoke_grn_prints(p_lot_ids uuid[], p_reason text)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT grn_print_private.revoke_grn_prints(p_lot_ids,p_reason); $$;
REVOKE ALL ON FUNCTION public.revoke_grn_prints(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_grn_prints(uuid[],text) TO authenticated, service_role;