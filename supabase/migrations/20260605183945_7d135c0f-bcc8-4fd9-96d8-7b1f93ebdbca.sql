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
  v_od_available numeric := 0;
  v_spendable numeric := 0;
BEGIN
  SELECT get_unified_user_id(p_user_email) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_wallet_balance
  FROM ledger_entries
  WHERE user_id = v_user_id;

  v_wallet_balance := GREATEST(0, v_wallet_balance);

  SELECT GREATEST(0, COALESCE(approved_limit, 0) - COALESCE(outstanding_balance, 0))
  INTO v_od_available
  FROM overdraft_accounts
  WHERE employee_email = p_user_email
    AND status = 'active'
    AND COALESCE(frozen, false) = false
  LIMIT 1;
  v_od_available := COALESCE(v_od_available, 0);

  v_spendable := v_wallet_balance + v_od_available;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_today_instant_total
  FROM instant_withdrawals
  WHERE user_id = v_user_id
    AND payout_status IN ('success', 'pending', 'pending_approval')
    AND created_at >= (now() AT TIME ZONE 'Africa/Kampala')::date::timestamptz;

  v_max_available := LEAST(v_spendable, 100000 - v_today_instant_total);
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
    'overdraft_available', v_od_available,
    'max_instant_amount', v_max_available,
    'today_withdrawn', v_today_instant_total,
    'daily_limit', 100000,
    'deposit_phone', v_deposit_phone,
    'reason', CASE
      WHEN NOT v_can_instant AND v_spendable < 2000 THEN 'Insufficient balance (minimum UGX 2,000)'
      WHEN NOT v_can_instant THEN 'Daily instant withdrawal limit of UGX 100,000 reached'
      ELSE 'Eligible for instant withdrawal'
    END
  );
END;
$function$;