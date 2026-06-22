CREATE OR REPLACE FUNCTION public.transfer_wallet_funds_secure(
  p_receiver_email text,
  p_amount numeric,
  p_reference text,
  p_use_overdraft boolean DEFAULT false
)
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
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_has_loan BOOLEAN := false;
  v_has_od_backstop BOOLEAN := false;
  v_reserve NUMERIC := 0;
  v_od RECORD;
  v_shortfall NUMERIC := 0;
  v_od_fee NUMERIC := 0;
  v_od_available NUMERIC := 0;
  v_new_outstanding NUMERIC := 0;
  v_od_ledger_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email, e.name INTO v_sender_email, v_sender_name
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid() AND e.status = 'Active' LIMIT 1;

  v_sender_email := COALESCE(v_sender_email, auth.jwt() ->> 'email');
  v_sender_name := COALESCE(v_sender_name, 'Unknown');

  IF v_sender_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Could not resolve sender');
  END IF;

  SELECT e.email, e.name INTO v_receiver_email, v_receiver_name
  FROM public.employees e
  WHERE lower(e.email) = lower(p_receiver_email) AND e.status = 'Active' LIMIT 1;

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

  SELECT COALESCE(SUM(amount), 0) INTO v_sender_balance
  FROM public.ledger_entries WHERE user_id = v_sender_user_id;

  -- Overdraft top-up if wallet insufficient
  IF v_sender_balance < p_amount THEN
    v_shortfall := p_amount - v_sender_balance;

    SELECT * INTO v_od FROM public.overdraft_accounts
    WHERE user_id::text = v_sender_user_id AND status = 'active' AND COALESCE(frozen, false) = false
    LIMIT 1;

    IF v_od.id IS NULL THEN
      RETURN json_build_object('success', false,
        'error', 'Insufficient balance. Available: UGX ' || trim(to_char(v_sender_balance, '999,999,999')));
    END IF;

    IF NOT p_use_overdraft THEN
      RETURN json_build_object('success', false,
        'error', 'Overdraft confirmation required for UGX ' || trim(to_char(v_shortfall, '999,999,999')) || ' shortfall.');
    END IF;

    v_od_fee := round(v_shortfall * 0.0275);
    v_od_available := GREATEST(0, v_od.approved_limit - v_od.outstanding_balance);

    IF (v_shortfall + v_od_fee) > v_od_available THEN
      RETURN json_build_object('success', false,
        'error', 'Overdraft cannot cover shortfall + 2.75% fee. Available overdraft: UGX ' || trim(to_char(v_od_available, '999,999,999')));
    END IF;
  END IF;

  -- Loan reserve check (only when not using overdraft to cover)
  BEGIN
    v_has_loan := COALESCE(public.has_active_loan_obligation(v_sender_user_id::uuid), false);
  EXCEPTION WHEN OTHERS THEN v_has_loan := false; END;

  IF v_has_loan THEN
    BEGIN
      v_has_od_backstop := COALESCE(public.has_overdraft_loan_backstop(v_sender_user_id::uuid, 10000), false);
    EXCEPTION WHEN OTHERS THEN v_has_od_backstop := false; END;
  END IF;

  IF v_has_loan AND NOT v_has_od_backstop AND v_shortfall = 0 THEN
    v_reserve := 10000;
    IF (v_sender_balance - p_amount) < v_reserve THEN
      RETURN json_build_object('success', false,
        'error', 'You have an active loan (as borrower or guarantor). UGX ' || trim(to_char(v_reserve, '999,999,999')) || ' must remain in your wallet. Available to send: UGX ' || trim(to_char(GREATEST(v_sender_balance - v_reserve, 0), '999,999,999')) || '.');
    END IF;
  END IF;

  v_debit_reference := p_reference || '-OUT-' || substr(gen_random_uuid()::text, 1, 8);
  v_credit_reference := p_reference || '-IN-' || substr(gen_random_uuid()::text, 1, 8);

  -- If overdraft top-up, post OVERDRAFT_DRAW deposit first so wallet covers the outgoing WITHDRAWAL
  IF v_shortfall > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_sender_user_id, 'DEPOSIT', v_shortfall,
      p_reference || '-ODDRAW-' || substr(gen_random_uuid()::text, 1, 8),
      'OVERDRAFT_DRAW',
      jsonb_build_object(
        'type', 'overdraft_draw',
        'overdraft_account_id', v_od.id,
        'reason', 'Wallet transfer top-up to ' || v_receiver_name,
        'fee_amount', v_od_fee,
        'fee_rate', 0.0275,
        'description', 'Overdraft draw for transfer (UGX ' || v_shortfall::text || ' + UGX ' || v_od_fee::text || ' fee)'
      )
    ) RETURNING id INTO v_od_ledger_id;

    v_new_outstanding := v_od.outstanding_balance + v_shortfall + v_od_fee;

    UPDATE public.overdraft_accounts SET
      outstanding_balance = v_new_outstanding,
      total_drawn = total_drawn + v_shortfall,
      last_used_at = now(),
      first_negative_at = COALESCE(first_negative_at, now())
    WHERE id = v_od.id;

    INSERT INTO public.overdraft_transactions (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
    VALUES (v_od.id, v_sender_user_id::uuid, 'draw', v_shortfall, v_new_outstanding, v_od_ledger_id,
            'OD-XFER-' || extract(epoch from now())::bigint::text,
            jsonb_build_object('reason', 'Transfer top-up', 'fee_amount', v_od_fee, 'fee_rate', 0.0275, 'transfer_ref', p_reference));

    INSERT INTO public.overdraft_transactions (account_id, user_id, transaction_type, amount, balance_after, reference, metadata)
    VALUES (v_od.id, v_sender_user_id::uuid, 'fee', v_od_fee, v_new_outstanding,
            'OD-XFER-FEE-' || extract(epoch from now())::bigint::text,
            jsonb_build_object('fee_rate', 0.0275, 'draw_amount', v_shortfall, 'note', '2.75% access fee on transfer top-up', 'transfer_ref', p_reference));
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_sender_user_id, 'WITHDRAWAL', -p_amount, v_debit_reference, 'INTERNAL_TRANSFER',
    jsonb_build_object(
      'type', 'wallet_transfer_out',
      'receiver_email', v_receiver_email,
      'receiver_name', v_receiver_name,
      'reference', p_reference,
      'used_overdraft', v_shortfall > 0,
      'overdraft_portion', v_shortfall,
      'overdraft_fee', v_od_fee,
      'description', 'Wallet transfer to ' || v_receiver_name
    )
  );

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_receiver_user_id, 'DEPOSIT', p_amount, v_credit_reference, 'INTERNAL_TRANSFER',
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
    'overdraft_used', v_shortfall,
    'overdraft_fee', v_od_fee,
    'debit_reference', v_debit_reference,
    'credit_reference', v_credit_reference
  );
END;
$function$;