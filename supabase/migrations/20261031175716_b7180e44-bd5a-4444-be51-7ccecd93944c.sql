DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT reference, amount FROM public.treasury_account_entries
           WHERE account_code='cash_at_bank' AND direction='credit'
             AND reference IN ('FUND-CASH_AT_BANK-20261031174450','BANK-DEPOSIT-20261031-1747-85000')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.treasury_account_entries WHERE reference = 'REVERSAL-' || r.reference) THEN
      PERFORM public.treasury_account_post('cash_at_bank','debit',r.amount,'external','REVERSAL-' || r.reference,NULL,NULL,NULL,
        'Reversal: reconciliation top-up was not a real bank deposit', 'Fauzakusa@greatpearlcoffee.com',
        jsonb_build_object('reverses', r.reference, 'reason','reconciliation correction'));
      BEGIN
        PERFORM public.record_treasury_entry('debit'::public.treasury_direction, r.amount, 'bank'::public.treasury_channel,
          'reconciliation'::public.treasury_category, 'REVERSAL-' || r.reference, NULL, NULL,
          'Reversal of Cash at Bank reconciliation top-up', 'Fauzakusa@greatpearlcoffee.com',
          jsonb_build_object('treasury_account','cash_at_bank','reverses', r.reference));
      EXCEPTION WHEN others THEN NULL; END;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.treasury_fund_account(p_account text, p_amount numeric, p_channel text DEFAULT 'yo_payments'::text, p_description text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_new NUMERIC; v_ref TEXT; v_by TEXT;
BEGIN
  IF NOT public.treasury_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the Super Admin can fund treasury accounts');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero'); END IF;
  IF p_account = 'user_wallets' THEN RETURN jsonb_build_object('ok', false, 'error', 'User Wallets is a liability account and cannot be funded directly'); END IF;
  IF EXISTS (SELECT 1 FROM public.treasury_accounts WHERE code = p_account AND kind = 'holding') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cash at Bank changes must be recorded as a bank deposit or withdrawal');
  END IF;
  v_by := COALESCE(public.current_user_email(), 'super_admin');
  v_ref := 'FUND-' || UPPER(p_account) || '-' || to_char(now(),'YYYYMMDDHH24MISS');
  v_new := public.treasury_account_post(p_account,'credit',p_amount,'external',v_ref,NULL,NULL,NULL,
             COALESCE(p_description,'Account funded by Super Admin'), v_by,
             jsonb_build_object('manual', true, 'channel', p_channel));
  BEGIN
    PERFORM public.record_treasury_entry('credit', p_amount,
      CASE WHEN p_channel IN ('cash','bank') THEN p_channel::public.treasury_channel ELSE 'yo_payments'::public.treasury_channel END,
      'topup', v_ref, NULL, NULL, 'Funding ' || p_account || ': ' || COALESCE(p_description,''), v_by,
      jsonb_build_object('treasury_account', p_account));
  EXCEPTION WHEN others THEN NULL; END;
  UPDATE public.treasury_alerts SET resolved_at = now() WHERE account_code = p_account AND resolved_at IS NULL AND alert_type IN ('insufficient','low_balance');
  RETURN jsonb_build_object('ok', true, 'reference', v_ref, 'balance', v_new);
END; $function$;