
-- Helper: does user have an active overdraft account with enough headroom to cover the loan reserve?
CREATE OR REPLACE FUNCTION public.has_overdraft_loan_backstop(p_user_id uuid, p_reserve numeric DEFAULT 10000)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available numeric := 0;
BEGIN
  SELECT GREATEST(0, COALESCE(approved_limit,0) - COALESCE(outstanding_balance,0))
    INTO v_available
  FROM public.overdraft_accounts
  WHERE user_id = p_user_id
    AND status = 'active'
    AND COALESCE(frozen, false) = false
  LIMIT 1;

  RETURN COALESCE(v_available, 0) >= p_reserve;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_overdraft_loan_backstop(uuid, numeric) TO authenticated, service_role;

-- Update validate_withdrawal_balance: skip 10k loan reserve when overdraft can backstop it.
CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_available numeric;
  v_reserve numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM ledger_entries
  WHERE user_id = p_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM withdrawal_requests
  WHERE user_id = p_user_id::text
    AND status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance');

  -- Loan minimum balance: keep UGX 10,000 in wallet if borrower or guarantor on active loan,
  -- UNLESS the user has an active overdraft account with >= 10,000 headroom (overdraft acts as backstop).
  IF public.has_active_loan_obligation(p_user_id)
     AND NOT public.has_overdraft_loan_backstop(p_user_id, 10000) THEN
    v_reserve := 10000;
  END IF;

  v_available := GREATEST(0, v_balance - v_pending - v_reserve);

  IF p_amount > v_available THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_withdrawal_balance(uuid, numeric) TO authenticated, service_role;

-- Update transfer_wallet_funds_secure: same overdraft backstop carve-out.
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
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_receiver_user_id TEXT;
  v_receiver_balance NUMERIC;
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_has_loan BOOLEAN := false;
  v_has_od_backstop BOOLEAN := false;
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
  WHERE lower(e.email) = lower(p_receiver_email)
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

  SELECT COALESCE(SUM(amount), 0)
    INTO v_sender_balance
  FROM public.ledger_entries
  WHERE user_id = v_sender_user_id;

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance. Available: UGX ' || trim(to_char(v_sender_balance, '999,999,999'))
    );
  END IF;

  BEGIN
    v_has_loan := COALESCE(public.has_active_loan_obligation(v_sender_user_id::uuid), false);
  EXCEPTION WHEN OTHERS THEN
    v_has_loan := false;
  END;

  IF v_has_loan THEN
    BEGIN
      v_has_od_backstop := COALESCE(public.has_overdraft_loan_backstop(v_sender_user_id::uuid, 10000), false);
    EXCEPTION WHEN OTHERS THEN
      v_has_od_backstop := false;
    END;
  END IF;

  IF v_has_loan AND NOT v_has_od_backstop THEN
    v_reserve := 10000;
    IF (v_sender_balance - p_amount) < v_reserve THEN
      RETURN json_build_object(
        'success', false,
        'error', 'You have an active loan (as borrower or guarantor). UGX ' || trim(to_char(v_reserve, '999,999,999')) || ' must remain in your wallet. Available to send: UGX ' || trim(to_char(GREATEST(v_sender_balance - v_reserve, 0), '999,999,999')) || '.'
      );
    END IF;
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
      'type', 'wallet_transfer_out',
      'receiver_email', v_receiver_email,
      'receiver_name', v_receiver_name,
      'reference', p_reference,
      'description', 'Wallet transfer to ' || v_receiver_name
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
      'type', 'wallet_transfer_in',
      'sender_email', v_sender_email,
      'sender_name', v_sender_name,
      'reference', p_reference,
      'description', 'Wallet transfer from ' || v_sender_name
    )
  );

  RETURN json_build_object(
    'success', true,
    'sender_email', v_sender_email,
    'receiver_email', v_receiver_email,
    'amount', p_amount,
    'debit_reference', v_debit_reference,
    'credit_reference', v_credit_reference
  );
END;
$function$;
