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

  -- Loan minimum balance enforcement (parity with instant-withdrawal):
  -- Borrowers and active guarantors must keep at least UGX 10,000 in their wallet.
  BEGIN
    v_has_loan := COALESCE(public.has_active_loan_obligation(v_sender_user_id::uuid), false);
  EXCEPTION WHEN OTHERS THEN
    v_has_loan := false;
  END;

  IF v_has_loan THEN
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

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_sender_user_id,
    'WITHDRAWAL',
    -p_amount,
    v_debit_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
      'tx_id', p_reference,
      'to_email', v_receiver_email,
      'to_name', v_receiver_name,
      'description', 'Sent UGX ' || trim(to_char(p_amount, '999,999,999')) || ' to ' || v_receiver_name
    )
  );

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_receiver_user_id,
    'DEPOSIT',
    p_amount,
    v_credit_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
      'tx_id', p_reference,
      'from_email', v_sender_email,
      'from_name', v_sender_name,
      'description', 'Received UGX ' || trim(to_char(p_amount, '999,999,999')) || ' from ' || v_sender_name
    )
  );

  SELECT COALESCE(SUM(amount), 0)
    INTO v_receiver_balance
  FROM public.ledger_entries
  WHERE user_id = v_receiver_user_id;

  RETURN json_build_object(
    'success', true,
    'tx_id', p_reference,
    'receiver_balance', v_receiver_balance,
    'receiver_name', v_receiver_name,
    'sender_name', v_sender_name
  );
END;
$function$;