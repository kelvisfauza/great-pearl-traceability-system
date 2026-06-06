
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
  v_od_available NUMERIC := 0;
  v_od_acc RECORD;
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_receiver_user_id TEXT;
  v_receiver_balance NUMERIC;
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_has_loan BOOLEAN := false;
  v_reserve NUMERIC := 0;
  v_consume jsonb;
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

  -- Add overdraft headroom to spendable
  SELECT * INTO v_od_acc FROM public.overdraft_accounts
   WHERE user_id = v_sender_user_id::uuid AND status = 'active' LIMIT 1;
  IF FOUND AND NOT v_od_acc.frozen THEN
    v_od_available := GREATEST(0, v_od_acc.approved_limit - v_od_acc.outstanding_balance);
  END IF;

  IF p_amount > v_sender_available + v_od_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance. Available: UGX ' || trim(to_char(v_sender_available + v_od_available, '999,999,999'))
    );
  END IF;

  v_debit_reference := p_reference || '-OUT-' || substr(gen_random_uuid()::text, 1, 8);
  v_credit_reference := p_reference || '-IN-' || substr(gen_random_uuid()::text, 1, 8);

  -- Use consume_spendable so wallet portion + overdraft portion get separate ledger entries
  v_consume := public.consume_spendable(
    v_sender_user_id::uuid,
    p_amount,
    'INTERNAL_TRANSFER',
    v_debit_reference,
    jsonb_build_object(
      'type', 'internal_transfer_credit',
      'tx_id', p_reference,
      'to_email', v_receiver_email,
      'to_name', v_receiver_name,
      'bypass_treasury_check', true,
      'description', 'Sent UGX ' || trim(to_char(p_amount, '999,999,999')) || ' to ' || v_receiver_name
    )
  );

  IF NOT COALESCE((v_consume->>'ok')::boolean, false) THEN
    RETURN json_build_object('success', false, 'error', COALESCE(v_consume->>'error', 'Debit failed'));
  END IF;

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
    'overdraft_portion', COALESCE((v_consume->>'overdraft_portion')::numeric, 0),
    'wallet_portion', COALESCE((v_consume->>'wallet_portion')::numeric, 0),
    'receiver_name', v_receiver_name,
    'sender_name', v_sender_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transfer_wallet_funds_secure(text, numeric, text) TO authenticated;
