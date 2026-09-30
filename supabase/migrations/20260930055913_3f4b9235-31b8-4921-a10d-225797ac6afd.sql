CREATE OR REPLACE FUNCTION public.vault_paid_pin_recovery()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_unified text;
  v_balance numeric := 0;
  v_fee numeric := 1000;
  v_access_fee numeric := 500;
  v_total numeric;
  v_overdraft boolean := false;
  v_pin text;
  v_ref text := 'VAULTREC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_today_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Please sign in again.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wallet_vault_pins WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_PIN', 'message', 'You have not created a vault PIN yet.');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  BEGIN v_unified := public.get_unified_user_id(v_email); EXCEPTION WHEN OTHERS THEN v_unified := v_uid::text; END;
  IF v_unified IS NULL THEN v_unified := v_uid::text; END IF;

  SELECT count(*) INTO v_today_count FROM public.ledger_entries
   WHERE user_id = v_unified AND metadata->>'source' = 'vault_pin_recovery_fee'
     AND created_at > now() - interval '24 hours';
  IF v_today_count >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'message', 'You have recovered your PIN 3 times today. Try again tomorrow.');
  END IF;

  SELECT COALESCE(sum(amount),0) INTO v_balance FROM public.ledger_entries WHERE user_id = v_unified;

  IF v_balance >= v_fee THEN
    v_total := v_fee;
  ELSE
    -- Overdraft recovery: fee + access fee, wallet goes negative (repaid from future deposits)
    v_overdraft := true;
    v_total := v_fee + v_access_fee;
  END IF;

  LOOP
    v_pin := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN v_pin NOT IN ('000000','111111','222222','333333','444444','555555','666666','777777','888888','999999','123456','654321');
  END LOOP;

  INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
  VALUES (v_unified, 'WITHDRAWAL', 'FEE', -v_total, v_ref,
    jsonb_build_object(
      'source','vault_pin_recovery_fee',
      'description', CASE WHEN v_overdraft
        THEN 'Vault PIN recovery fee (overdraft: UGX 1,000 + UGX 500 access fee)'
        ELSE 'Vault PIN recovery fee' END,
      'overdraft', v_overdraft,
      'recovery_fee', v_fee,
      'access_fee', CASE WHEN v_overdraft THEN v_access_fee ELSE 0 END,
      'balance_before', v_balance,
      'bypass_treasury_check', true));

  UPDATE public.wallet_vault_pins
     SET pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf', 10)),
         failed_attempts = 0, locked_until = NULL
   WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'pin', v_pin, 'fee', v_total, 'overdraft', v_overdraft, 'reference', v_ref);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.vault_paid_pin_recovery() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_paid_pin_recovery() TO authenticated;