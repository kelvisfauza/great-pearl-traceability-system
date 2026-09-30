CREATE OR REPLACE FUNCTION public.get_treasury_accounts_overview()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_accounts JSONB; v_alerts JSONB; v_expected NUMERIC; v_gosente NUMERIC; v_yo NUMERIC; v_yo_at TIMESTAMPTZ;
BEGIN
  IF NOT (public.can_manage_users() OR public.can_approve_finance()) THEN RETURN jsonb_build_object('ok', false, 'error', 'Admin or Finance access required'); END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order), '[]'::jsonb) INTO v_accounts FROM public.treasury_accounts a WHERE a.is_active;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_alerts
    FROM (SELECT * FROM public.treasury_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 50) x;
  SELECT COALESCE(SUM(balance),0) INTO v_expected FROM public.treasury_accounts WHERE is_active;
  SELECT COALESCE(balance,0) INTO v_gosente FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  SELECT last_yo_synced_balance, last_yo_synced_at INTO v_yo, v_yo_at FROM public.treasury_pool_balance WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'accounts', v_accounts, 'alerts', v_alerts,
    'expected_float', v_expected, 'yo_balance', COALESCE(v_yo,0), 'yo_synced_at', v_yo_at,
    'gosente_balance', COALESCE(v_gosente,0), 'actual_float', COALESCE(v_yo,0) + COALESCE(v_gosente,0),
    'drift', (COALESCE(v_yo,0) + COALESCE(v_gosente,0)) - v_expected,
    'is_super_admin', public.treasury_is_super_admin());
END; $function$;