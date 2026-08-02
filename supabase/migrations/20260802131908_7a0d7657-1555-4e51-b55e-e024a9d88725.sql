
REVOKE EXECUTE ON FUNCTION public.v3_issue_grn(uuid, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_dispatch_transfer(uuid, uuid, integer, numeric, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_receive_transfer(uuid, numeric, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_start_production_run(uuid, numeric, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_complete_production_run(uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_next_number(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.v3_log(text, text, uuid, jsonb, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.v3_issue_grn(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_dispatch_transfer(uuid, uuid, integer, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_receive_transfer(uuid, numeric, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_start_production_run(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_complete_production_run(uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text) TO authenticated;
