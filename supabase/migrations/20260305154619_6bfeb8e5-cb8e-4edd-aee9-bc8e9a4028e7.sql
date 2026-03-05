CREATE OR REPLACE FUNCTION public.transfer_wallet_funds_secure(
  p_receiver_email TEXT,
  p_amount NUMERIC,
  p_reference TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE user_id = v_sender_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_sender_user_id,
    'WITHDRAWAL',
    -p_amount,
    p_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
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
    p_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
      'from_email', v_sender_email,
      'from_name', v_sender_name,
      'description', 'Received UGX ' || trim(to_char(p_amount, '999,999,999')) || ' from ' || v_sender_name
    )
  );

  SELECT COALESCE(SUM(amount), 0)
    INTO v_receiver_balance
  FROM public.ledger_entries
  WHERE user_id = v_receiver_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  RETURN json_build_object(
    'success', true,
    'receiver_balance', v_receiver_balance,
    'receiver_name', v_receiver_name,
    'sender_name', v_sender_name
  );
END;
$function$;