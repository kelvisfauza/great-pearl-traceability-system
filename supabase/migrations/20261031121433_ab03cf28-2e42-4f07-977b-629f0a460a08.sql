INSERT INTO public.treasury_accounts (code, name, description, kind, balance, sort_order)
VALUES ('cash_at_bank','Cash at Bank','Real money held at the bank (outside Yo and GosentePay). Counted as real money in reconciliation.','holding',0,5)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE v_expected NUMERIC; v_yo NUMERIC; v_gos NUMERIC; v_open NUMERIC;
BEGIN
  IF EXISTS (SELECT 1 FROM public.treasury_account_entries WHERE reference='BANK-OPENING-BALANCE') THEN RETURN; END IF;
  SELECT COALESCE(SUM(balance),0) INTO v_expected FROM public.treasury_accounts WHERE is_active AND kind <> 'holding';
  SELECT COALESCE(last_yo_synced_balance,0) INTO v_yo FROM public.treasury_pool_balance WHERE id=1;
  SELECT COALESCE(balance,0) INTO v_gos FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  v_open := v_expected - COALESCE(v_yo,0) - COALESCE(v_gos,0);
  IF v_open > 0 THEN
    PERFORM public.treasury_account_post('cash_at_bank','credit',v_open,'external','BANK-OPENING-BALANCE',NULL,NULL,NULL,
      'Opening balance: money held at bank (account total minus Yo and GosentePay)','Fauza Kelvis',
      jsonb_build_object('opening',true,'account_total',v_expected,'yo',v_yo,'gosente',v_gos));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.treasury_bank_movement(p_direction text, p_amount numeric, p_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_new NUMERIC; v_ref TEXT; v_by TEXT;
BEGIN
  IF NOT public.treasury_is_super_admin() THEN RETURN jsonb_build_object('ok',false,'error','Only the Super Admin can record bank movements'); END IF;
  IF p_direction NOT IN ('deposit','withdraw') THEN RETURN jsonb_build_object('ok',false,'error','Choose deposit or withdraw'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok',false,'error','Amount must be greater than zero'); END IF;
  v_by := COALESCE(public.current_user_email(),'super_admin');
  v_ref := 'BANK-' || UPPER(p_direction) || '-' || to_char(now(),'YYYYMMDDHH24MISS');
  BEGIN
    v_new := public.treasury_account_post('cash_at_bank', CASE WHEN p_direction='deposit' THEN 'credit' ELSE 'debit' END, p_amount,'external',v_ref,NULL,NULL,NULL,
      COALESCE(p_description, CASE WHEN p_direction='deposit' THEN 'Bank deposit' ELSE 'Bank withdrawal' END), v_by, jsonb_build_object('manual',true,'bank_movement',p_direction));
  EXCEPTION WHEN others THEN RETURN jsonb_build_object('ok',false,'error',SQLERRM); END;
  RETURN jsonb_build_object('ok',true,'reference',v_ref,'balance',v_new);
END; $function$;
REVOKE ALL ON FUNCTION public.treasury_bank_movement(text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treasury_bank_movement(text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_treasury_accounts_overview()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_accounts JSONB; v_alerts JSONB; v_expected NUMERIC; v_gosente NUMERIC; v_yo NUMERIC; v_yo_at TIMESTAMPTZ; v_bank NUMERIC;
BEGIN
  IF NOT (public.can_manage_users() OR public.can_approve_finance()) THEN RETURN jsonb_build_object('ok', false, 'error', 'Admin or Finance access required'); END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order), '[]'::jsonb) INTO v_accounts FROM public.treasury_accounts a WHERE a.is_active;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_alerts
    FROM (SELECT * FROM public.treasury_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 50) x;
  SELECT COALESCE(SUM(balance),0) INTO v_expected FROM public.treasury_accounts WHERE is_active AND kind <> 'holding';
  SELECT COALESCE(SUM(balance),0) INTO v_bank FROM public.treasury_accounts WHERE is_active AND kind = 'holding';
  SELECT COALESCE(balance,0) INTO v_gosente FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  SELECT last_yo_synced_balance, last_yo_synced_at INTO v_yo, v_yo_at FROM public.treasury_pool_balance WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'accounts', v_accounts, 'alerts', v_alerts,
    'expected_float', v_expected, 'yo_balance', COALESCE(v_yo,0), 'yo_synced_at', v_yo_at,
    'gosente_balance', COALESCE(v_gosente,0), 'bank_balance', v_bank,
    'actual_float', COALESCE(v_yo,0) + COALESCE(v_gosente,0) + v_bank,
    'drift', (COALESCE(v_yo,0) + COALESCE(v_gosente,0) + v_bank) - v_expected,
    'is_super_admin', public.treasury_is_super_admin());
END; $function$;

UPDATE public.treasury_alerts SET resolved_at = now() WHERE alert_type='drift' AND resolved_at IS NULL;