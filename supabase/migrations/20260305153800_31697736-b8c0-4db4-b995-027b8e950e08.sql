CREATE OR REPLACE FUNCTION public.transfer_wallet_funds(
  p_sender_user_id TEXT,
  p_receiver_user_id TEXT,
  p_amount NUMERIC,
  p_reference TEXT,
  p_sender_email TEXT,
  p_sender_name TEXT,
  p_receiver_email TEXT,
  p_receiver_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sender_balance NUMERIC;
  v_receiver_balance NUMERIC;
  v_auth_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Resolve authenticated user's email
  SELECT e.email INTO v_auth_email
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
  LIMIT 1;

  v_auth_email := COALESCE(v_auth_email, auth.jwt() ->> 'email');

  -- Security check: caller can only transfer from their own account/email
  IF v_auth_email IS NULL OR lower(v_auth_email) <> lower(p_sender_email) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized transfer attempt');
  END IF;

  -- Ensure sender id matches canonical mapping for sender email
  IF p_sender_user_id IS DISTINCT FROM public.get_unified_user_id(p_sender_email) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sender account mapping');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_sender_balance
  FROM public.ledger_entries
  WHERE user_id = p_sender_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  IF p_amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is UGX 500');
  END IF;

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    p_sender_user_id,
    'WITHDRAWAL',
    -p_amount,
    p_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
      'to_email', p_receiver_email,
      'to_name', p_receiver_name,
      'description', 'Sent UGX ' || trim(to_char(p_amount, '999,999,999')) || ' to ' || p_receiver_name
    )
  );

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    p_receiver_user_id,
    'DEPOSIT',
    p_amount,
    p_reference,
    jsonb_build_object(
      'type', 'wallet_transfer',
      'from_email', p_sender_email,
      'from_name', p_sender_name,
      'description', 'Received UGX ' || trim(to_char(p_amount, '999,999,999')) || ' from ' || p_sender_name
    )
  );

  SELECT COALESCE(SUM(amount), 0)
    INTO v_receiver_balance
  FROM public.ledger_entries
  WHERE user_id = p_receiver_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  RETURN json_build_object(
    'success', true,
    'receiver_balance', v_receiver_balance
  );
END;
$function$;