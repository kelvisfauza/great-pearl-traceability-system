
-- 1) Update default & existing OD interest rate to 0.6% per day
UPDATE public.overdraft_accounts SET interest_rate_bps = 60 WHERE status = 'active';
ALTER TABLE public.overdraft_accounts ALTER COLUMN interest_rate_bps SET DEFAULT 60;

-- 2) Rewrite transfer_wallet_funds_secure so the wallet truly goes negative when overdraft is used.
CREATE OR REPLACE FUNCTION public.transfer_wallet_funds_secure(
  p_receiver_email text, p_amount numeric, p_reference text, p_use_overdraft boolean DEFAULT false
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
  v_od_fee_ledger_id UUID;
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

  v_sender_balance := public.get_effective_wallet_balance(v_sender_user_id);

  -- Block sending if already negative (must clear OD first)
  IF v_sender_balance < 0 THEN
    RETURN json_build_object('success', false,
      'error', 'Wallet is in overdraft (UGX ' || trim(to_char(abs(v_sender_balance), '999,999,999')) || '). Receive funds to clear before sending.');
  END IF;

  -- Need overdraft?
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

  -- Loan reserve check (only when not using overdraft)
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

  -- Full withdrawal posts first (wallet may go negative)
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

  -- If overdraft was used, post the 2.75% fee as a negative entry (deepens the negative wallet)
  IF v_shortfall > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_sender_user_id, 'WITHDRAWAL', -v_od_fee,
      p_reference || '-ODFEE-' || substr(gen_random_uuid()::text, 1, 8),
      'OVERDRAFT_FEE',
      jsonb_build_object(
        'type', 'overdraft_fee',
        'overdraft_account_id', v_od.id,
        'shortfall', v_shortfall,
        'fee_rate', 0.0275,
        'transfer_ref', p_reference,
        'description', 'Overdraft 2.75% access fee on UGX ' || trim(to_char(v_shortfall, '999,999,999'))
      )
    ) RETURNING id INTO v_od_fee_ledger_id;

    v_new_outstanding := COALESCE(v_od.outstanding_balance, 0) + v_shortfall + v_od_fee;

    UPDATE public.overdraft_accounts SET
      outstanding_balance = v_new_outstanding,
      total_drawn = COALESCE(total_drawn, 0) + v_shortfall,
      last_used_at = now(),
      first_negative_at = COALESCE(first_negative_at, now())
    WHERE id = v_od.id;

    INSERT INTO public.overdraft_transactions (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
    VALUES (v_od.id, v_sender_user_id::uuid, 'draw', v_shortfall, v_new_outstanding, NULL,
            'OD-XFER-' || extract(epoch from now())::bigint::text,
            jsonb_build_object('reason', 'Transfer top-up', 'fee_amount', v_od_fee, 'fee_rate', 0.0275, 'transfer_ref', p_reference, 'mode', 'negative_wallet'));

    INSERT INTO public.overdraft_transactions (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
    VALUES (v_od.id, v_sender_user_id::uuid, 'fee', v_od_fee, v_new_outstanding, v_od_fee_ledger_id,
            'OD-XFER-FEE-' || extract(epoch from now())::bigint::text,
            jsonb_build_object('fee_rate', 0.0275, 'draw_amount', v_shortfall, 'transfer_ref', p_reference));
  END IF;

  -- Credit the receiver
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
    'sender_wallet_after', v_sender_balance - p_amount - v_od_fee,
    'debit_reference', v_debit_reference,
    'credit_reference', v_credit_reference
  );
END;
$function$;

-- 3) Update validate_withdrawal_balance to include OD headroom
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
  v_od_headroom numeric := 0;
  v_od RECORD;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM ledger_entries
  WHERE user_id = p_user_id::text
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM withdrawal_requests
  WHERE user_id = p_user_id::text
    AND status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance');

  IF public.has_active_loan_obligation(p_user_id)
     AND NOT public.has_overdraft_loan_backstop(p_user_id, 10000) THEN
    v_reserve := 10000;
  END IF;

  -- Overdraft headroom available to spend (only when wallet >= 0)
  IF v_balance >= 0 THEN
    SELECT * INTO v_od FROM public.overdraft_accounts
     WHERE user_id = p_user_id AND status = 'active' AND COALESCE(frozen,false) = false LIMIT 1;
    IF FOUND THEN
      -- reserve room for 2.75% fee on the would-be draw portion
      v_od_headroom := GREATEST(0, v_od.approved_limit - v_od.outstanding_balance);
      v_od_headroom := floor(v_od_headroom / 1.0275);
    END IF;
  END IF;

  v_available := GREATEST(0, v_balance - v_pending - v_reserve) + v_od_headroom;

  RETURN p_amount <= v_available;
END;
$function$;

-- 4) Update overdraft_daily_maintenance description text for 0.6%/day
CREATE OR REPLACE FUNCTION public.overdraft_daily_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_interest numeric;
  v_new_out numeric;
  v_ledger_id uuid;
  v_accrued int := 0;
  v_penalties int := 0;
  v_rate_bps int;
  v_days int;
  v_is_penalty boolean;
  v_ref text;
  v_desc text;
BEGIN
  FOR r IN
    SELECT * FROM public.overdraft_accounts
     WHERE status = 'active' AND outstanding_balance > 0
  LOOP
    v_days := COALESCE(EXTRACT(DAY FROM (now() - r.first_negative_at))::int, 0);

    IF v_days >= 5 THEN
      v_rate_bps := 1000;
      v_is_penalty := true;
      v_ref := 'OD-PEN-' || r.id::text || '-' || to_char(now(),'YYYYMMDD');
      v_desc := 'Overdraft penalty (10%/day after 5 days outstanding)';
    ELSE
      v_rate_bps := COALESCE(r.interest_rate_bps, 60);
      v_is_penalty := false;
      v_ref := 'OD-INT-' || r.id::text || '-' || to_char(now(),'YYYYMMDD');
      v_desc := 'Daily overdraft charge (' || (v_rate_bps::numeric/100)::text || '%/day)';
    END IF;

    v_interest := round(r.outstanding_balance * (v_rate_bps::numeric / 10000), 0);
    IF v_interest > 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
      VALUES (
        r.user_id::text, 'WITHDRAWAL', -v_interest, v_ref,
        jsonb_build_object('type', CASE WHEN v_is_penalty THEN 'overdraft_penalty' ELSE 'overdraft_interest' END,
                           'overdraft_account_id', r.id,
                           'rate_bps', v_rate_bps,
                           'days_outstanding', v_days,
                           'is_penalty', v_is_penalty,
                           'description', v_desc),
        CASE WHEN v_is_penalty THEN 'OVERDRAFT_PENALTY' ELSE 'OVERDRAFT_INTEREST' END
      ) RETURNING id INTO v_ledger_id;

      v_new_out := r.outstanding_balance + v_interest;
      UPDATE public.overdraft_accounts
         SET outstanding_balance = v_new_out,
             total_interest = COALESCE(total_interest,0) + v_interest,
             last_interest_at = now(),
             updated_at = now()
       WHERE id = r.id;

      INSERT INTO public.overdraft_transactions
        (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
      VALUES
        (r.id, r.user_id, CASE WHEN v_is_penalty THEN 'penalty' ELSE 'interest' END,
         v_interest, v_new_out, v_ledger_id,
         CASE WHEN v_is_penalty THEN 'DAILY-PEN' ELSE 'DAILY-INT' END,
         jsonb_build_object('rate_bps', v_rate_bps, 'days_outstanding', v_days, 'is_penalty', v_is_penalty));

      IF v_is_penalty THEN v_penalties := v_penalties + 1; ELSE v_accrued := v_accrued + 1; END IF;
    END IF;
  END LOOP;

  UPDATE public.overdraft_accounts
     SET frozen = true, updated_at = now()
   WHERE status = 'active'
     AND outstanding_balance > 0
     AND frozen = false
     AND first_negative_at < now() - interval '30 days';

  RETURN jsonb_build_object('ok', true, 'accrued', v_accrued, 'penalties', v_penalties);
END;
$function$;

-- 5) Update get_overdraft_spendable to net out fee headroom & reflect negative wallet correctly
CREATE OR REPLACE FUNCTION public.get_overdraft_spendable(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet numeric;
  v_acc RECORD;
  v_available numeric := 0;
  v_frozen boolean := false;
BEGIN
  v_wallet := COALESCE(public.get_wallet_balance(p_user_id), 0);
  SELECT * INTO v_acc FROM public.overdraft_accounts
   WHERE user_id = p_user_id AND status = 'active' LIMIT 1;
  IF FOUND THEN
    v_frozen := v_acc.frozen;
    IF NOT v_acc.frozen THEN
      v_available := floor(GREATEST(0, v_acc.approved_limit - v_acc.outstanding_balance) / 1.0275);
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'wallet', v_wallet,
    'overdraft_available', v_available,
    'overdraft_limit', COALESCE(v_acc.approved_limit, 0),
    'overdraft_outstanding', COALESCE(v_acc.outstanding_balance, 0),
    'spendable', GREATEST(v_wallet, 0) + CASE WHEN v_wallet >= 0 THEN v_available ELSE 0 END,
    'frozen', v_frozen,
    'has_overdraft', v_acc.id IS NOT NULL
  );
END;
$function$;
