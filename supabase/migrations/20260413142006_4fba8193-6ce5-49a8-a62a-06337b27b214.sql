CREATE OR REPLACE FUNCTION public.get_instant_withdrawal_eligibility(p_user_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
  v_wallet_balance numeric := 0;
  v_today_instant_total numeric := 0;
  v_can_instant boolean := false;
  v_max_available numeric := 0;
  v_deposit_phone text;
  v_raw_metadata jsonb;
BEGIN
  SELECT get_unified_user_id(p_user_email) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_wallet_balance
  FROM ledger_entries
  WHERE user_id = v_user_id;

  v_wallet_balance := GREATEST(0, v_wallet_balance);

  -- Sum today's successful/pending instant withdrawals (no frequency limit, just daily total cap)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_today_instant_total
  FROM instant_withdrawals
  WHERE user_id = v_user_id
    AND payout_status IN ('success', 'pending', 'pending_approval')
    AND created_at >= (now() AT TIME ZONE 'Africa/Kampala')::date::timestamptz;

  -- Daily limit is 150,000 UGX (no per-transaction frequency limit)
  v_max_available := LEAST(v_wallet_balance, 150000 - v_today_instant_total);
  v_max_available := GREATEST(0, v_max_available);

  SELECT metadata INTO v_raw_metadata
  FROM ledger_entries
  WHERE user_id = v_user_id AND source_category = 'SELF_DEPOSIT' AND amount > 0
  ORDER BY created_at DESC LIMIT 1;

  IF v_raw_metadata IS NOT NULL THEN
    v_deposit_phone := v_raw_metadata->>'phone';
    IF v_deposit_phone IS NULL AND jsonb_typeof(v_raw_metadata) = 'string' THEN
      BEGIN
        v_deposit_phone := (v_raw_metadata#>>'{}')::jsonb->>'phone';
      EXCEPTION WHEN OTHERS THEN
        v_deposit_phone := NULL;
      END;
    END IF;
  END IF;

  IF v_deposit_phone IS NULL THEN
    SELECT phone INTO v_deposit_phone
    FROM mobile_money_transactions
    WHERE user_id = v_user_id AND transaction_type = 'deposit' AND status = 'completed'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_can_instant := v_max_available >= 2000;

  RETURN jsonb_build_object(
    'eligible', v_can_instant,
    'wallet_balance', v_wallet_balance,
    'self_deposit_balance', v_wallet_balance,
    'max_instant_amount', v_max_available,
    'today_withdrawn', v_today_instant_total,
    'daily_limit', 150000,
    'deposit_phone', v_deposit_phone,
    'reason', CASE 
      WHEN NOT v_can_instant AND v_wallet_balance < 2000 THEN 'Insufficient wallet balance (minimum UGX 2,000)'
      WHEN NOT v_can_instant THEN 'Daily instant withdrawal limit of UGX 150,000 reached'
      ELSE 'Eligible for instant withdrawal'
    END
  );
END;
$function$;