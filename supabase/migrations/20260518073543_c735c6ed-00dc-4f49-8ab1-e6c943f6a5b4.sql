CREATE OR REPLACE FUNCTION public.get_effective_wallet_balance(p_user_id text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(le.amount), 0)
  FROM public.ledger_entries le
  WHERE le.user_id = p_user_id
    AND le.entry_type IN (
      'LOYALTY_REWARD',
      'BONUS',
      'DEPOSIT',
      'WITHDRAWAL',
      'ADJUSTMENT',
      'MONTHLY_SALARY',
      'ADVANCE_RECOVERY',
      'LOAN_DISBURSEMENT',
      'LOAN_REPAYMENT',
      'LOAN_RECOVERY'
    )
    AND NOT (
      COALESCE(le.metadata->>'allowance_type', '') IN ('airtime_allowance', 'data_allowance')
      AND le.entry_type IN ('DEPOSIT', 'PAYOUT')
    );
$$;

CREATE OR REPLACE FUNCTION public.get_pending_wallet_commitments(p_user_id text, p_user_email text DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH legacy_pending AS (
    SELECT COALESCE(SUM(wr.amount), 0) AS amount
    FROM public.withdrawal_requests wr
    WHERE wr.user_id::text = p_user_id
      AND LOWER(COALESCE(wr.status, '')) IN (
        'pending',
        'processing',
        'pending_approval',
        'pending_admin',
        'pending_admin_2',
        'pending_admin_3',
        'pending_finance'
      )
  ),
  approval_pending AS (
    SELECT COALESCE(SUM(ar.amount), 0) AS amount
    FROM public.approval_requests ar
    WHERE LOWER(COALESCE(ar.type, '')) LIKE '%withdraw%'
      AND (
        LOWER(COALESCE(ar.status, '')) LIKE 'pending%'
        OR LOWER(COALESCE(ar.approval_stage, '')) LIKE 'pending%'
        OR LOWER(COALESCE(ar.status, '')) = 'processing'
        OR LOWER(COALESCE(ar.approval_stage, '')) = 'processing'
      )
      AND (
        COALESCE(ar.details->>'user_id', '') = p_user_id
        OR (
          p_user_email IS NOT NULL
          AND LOWER(COALESCE(ar.requestedby, '')) = LOWER(p_user_email)
        )
      )
  )
  SELECT COALESCE((SELECT amount FROM legacy_pending), 0)
       + COALESCE((SELECT amount FROM approval_pending), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_wallet_balance(user_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_effective_wallet_balance(user_uuid::text);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_wallet_balance_safe(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_effective_wallet_balance(user_uuid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_balance_safe(user_email text)
RETURNS TABLE(email text, name text, auth_user_id uuid, wallet_balance numeric, pending_withdrawals numeric, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
  v_wallet_balance numeric;
  v_pending numeric;
BEGIN
  v_user_id := public.get_unified_user_id(user_email);
  v_wallet_balance := public.get_effective_wallet_balance(v_user_id);
  v_pending := public.get_pending_wallet_commitments(v_user_id, user_email);

  RETURN QUERY
  SELECT 
    e.email,
    e.name,
    e.auth_user_id,
    v_wallet_balance AS wallet_balance,
    v_pending AS pending_withdrawals,
    GREATEST(0, v_wallet_balance - v_pending) AS available_balance
  FROM public.employees e
  WHERE e.email = user_email;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      user_email AS email,
      'Unknown User'::text AS name,
      NULL::uuid AS auth_user_id,
      v_wallet_balance AS wallet_balance,
      v_pending AS pending_withdrawals,
      GREATEST(0, v_wallet_balance - v_pending) AS available_balance;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_available numeric;
  v_reserve numeric := 0;
  v_email text;
BEGIN
  SELECT e.email INTO v_email
  FROM public.employees e
  WHERE e.auth_user_id = p_user_id
  LIMIT 1;

  v_balance := public.get_effective_wallet_balance(p_user_id::text);
  v_pending := public.get_pending_wallet_commitments(p_user_id::text, v_email);

  IF public.has_active_loan_obligation(p_user_id) THEN
    v_reserve := 10000;
  END IF;

  v_available := GREATEST(0, v_balance - v_pending - v_reserve);
  RETURN p_amount <= v_available;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_wallet_funds_secure(p_receiver_email text, p_amount numeric, p_reference text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_email TEXT;
  v_sender_name TEXT;
  v_sender_user_id TEXT;
  v_sender_balance NUMERIC;
  v_sender_pending NUMERIC;
  v_sender_available NUMERIC;
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_receiver_user_id TEXT;
  v_receiver_balance NUMERIC;
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_has_loan BOOLEAN := false;
  v_reserve NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email, e.name
    INTO v_sender_email, v_sender_name
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.status = 'Active'
  LIMIT 1;

  v_sender_email := COALESCE(v_sender_email, auth.jwt() ->> 'email');
  v_sender_name := COALESCE(v_sender_name, 'Unknown');

  IF v_sender_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Could not resolve sender');
  END IF;

  SELECT e.email, e.name
    INTO v_receiver_email, v_receiver_name
  FROM public.employees e
  WHERE LOWER(e.email) = LOWER(p_receiver_email)
    AND e.status = 'Active'
  LIMIT 1;

  IF v_receiver_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Receiver not found or inactive');
  END IF;

  v_sender_user_id := public.get_unified_user_id(v_sender_email);
  v_receiver_user_id := public.get_unified_user_id(v_receiver_email);

  IF v_sender_user_id IS NULL OR v_receiver_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Could not resolve account IDs');
  END IF;

  IF v_sender_user_id = v_receiver_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send money to yourself');
  END IF;

  IF p_amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is UGX 500');
  END IF;

  v_sender_balance := public.get_effective_wallet_balance(v_sender_user_id);
  v_sender_pending := public.get_pending_wallet_commitments(v_sender_user_id, v_sender_email);

  BEGIN
    v_has_loan := COALESCE(public.has_active_loan_obligation(v_sender_user_id::uuid), false);
  EXCEPTION WHEN OTHERS THEN
    v_has_loan := false;
  END;

  IF v_has_loan THEN
    v_reserve := 10000;
  END IF;

  v_sender_available := GREATEST(0, v_sender_balance - v_sender_pending - v_reserve);

  IF p_amount > v_sender_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance. Available: UGX ' || trim(to_char(v_sender_available, '999,999,999'))
    );
  END IF;

  v_debit_reference := p_reference || '-OUT-' || substr(gen_random_uuid()::text, 1, 8);
  v_credit_reference := p_reference || '-IN-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_sender_user_id,
    'WITHDRAWAL',
    -p_amount,
    v_debit_reference,
    'INTERNAL_TRANSFER',
    jsonb_build_object(
      'type', 'internal_transfer_credit',
      'tx_id', p_reference,
      'to_email', v_receiver_email,
      'to_name', v_receiver_name,
      'bypass_treasury_check', true,
      'description', 'Sent UGX ' || trim(to_char(p_amount, '999,999,999')) || ' to ' || v_receiver_name
    )
  );

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_receiver_user_id,
    'DEPOSIT',
    p_amount,
    v_credit_reference,
    'INTERNAL_TRANSFER',
    jsonb_build_object(
      'type', 'internal_transfer_credit',
      'tx_id', p_reference,
      'from_email', v_sender_email,
      'from_name', v_sender_name,
      'description', 'Received UGX ' || trim(to_char(p_amount, '999,999,999')) || ' from ' || v_sender_name
    )
  );

  v_receiver_balance := public.get_effective_wallet_balance(v_receiver_user_id);
  v_sender_balance := public.get_effective_wallet_balance(v_sender_user_id);

  RETURN json_build_object(
    'success', true,
    'tx_id', p_reference,
    'receiver_balance', v_receiver_balance,
    'sender_balance', v_sender_balance,
    'sender_available_balance', GREATEST(0, v_sender_balance - public.get_pending_wallet_commitments(v_sender_user_id, v_sender_email) - v_reserve),
    'receiver_name', v_receiver_name,
    'sender_name', v_sender_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_effective_wallet_balance(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_wallet_commitments(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_balance_safe(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_withdrawal_balance(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_wallet_funds_secure(text, numeric, text) TO authenticated;