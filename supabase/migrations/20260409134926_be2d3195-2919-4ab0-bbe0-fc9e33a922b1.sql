-- Fix the get_instant_withdrawal_eligibility function to handle double-encoded JSON metadata
CREATE OR REPLACE FUNCTION public.get_instant_withdrawal_eligibility(p_user_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id text;
  v_self_deposit_total numeric := 0;
  v_self_deposit_withdrawn numeric := 0;
  v_self_deposit_balance numeric := 0;
  v_today_instant_total numeric := 0;
  v_last_instant_at timestamptz;
  v_can_instant boolean := false;
  v_max_available numeric := 0;
  v_deposit_phone text;
  v_raw_metadata jsonb;
BEGIN
  SELECT get_unified_user_id(p_user_email) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_self_deposit_total
  FROM ledger_entries
  WHERE user_id = v_user_id AND source_category = 'SELF_DEPOSIT' AND amount > 0;

  SELECT COALESCE(SUM(amount), 0) INTO v_self_deposit_withdrawn
  FROM instant_withdrawals
  WHERE user_id = v_user_id AND payout_status IN ('success', 'pending');

  v_self_deposit_balance := GREATEST(0, v_self_deposit_total - v_self_deposit_withdrawn);

  SELECT COALESCE(SUM(amount), 0), MAX(created_at)
  INTO v_today_instant_total, v_last_instant_at
  FROM instant_withdrawals
  WHERE user_id = v_user_id
    AND payout_status IN ('success', 'pending')
    AND created_at >= (now() AT TIME ZONE 'Africa/Kampala')::date::timestamptz;

  IF v_last_instant_at IS NOT NULL AND v_last_instant_at > now() - interval '24 hours' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'You can only make one instant withdrawal per 24 hours',
      'self_deposit_balance', v_self_deposit_balance,
      'next_eligible_at', v_last_instant_at + interval '24 hours',
      'today_withdrawn', v_today_instant_total
    );
  END IF;

  v_max_available := LEAST(v_self_deposit_balance, 100000 - v_today_instant_total);
  v_max_available := GREATEST(0, v_max_available);

  -- Get deposit phone, handling both proper jsonb and double-encoded string metadata
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

  -- Fallback: get phone from mobile_money_transactions
  IF v_deposit_phone IS NULL THEN
    SELECT phone INTO v_deposit_phone
    FROM mobile_money_transactions
    WHERE user_id = v_user_id AND transaction_type = 'deposit' AND status = 'completed'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_can_instant := v_max_available >= 2000;

  RETURN jsonb_build_object(
    'eligible', v_can_instant,
    'self_deposit_balance', v_self_deposit_balance,
    'max_instant_amount', v_max_available,
    'today_withdrawn', v_today_instant_total,
    'daily_limit', 100000,
    'deposit_phone', v_deposit_phone,
    'reason', CASE 
      WHEN NOT v_can_instant AND v_self_deposit_balance < 2000 THEN 'Insufficient self-deposited funds (minimum UGX 2,000)'
      WHEN NOT v_can_instant THEN 'Daily instant withdrawal limit reached'
      ELSE 'Eligible for instant withdrawal'
    END
  );
END;
$function$;

-- Fix existing double-encoded metadata entries
UPDATE ledger_entries 
SET metadata = (metadata#>>'{}')::jsonb
WHERE source_category = 'SELF_DEPOSIT' 
  AND jsonb_typeof(metadata) = 'string';