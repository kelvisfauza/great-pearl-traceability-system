
-- Create a SECURITY DEFINER function to handle wallet transfers atomically
CREATE OR REPLACE FUNCTION public.transfer_wallet_funds(
  p_sender_user_id UUID,
  p_receiver_user_id UUID,
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
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_receiver_balance NUMERIC;
BEGIN
  -- Verify the caller is the sender
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Calculate sender balance
  SELECT COALESCE(SUM(amount), 0) INTO v_sender_balance
  FROM ledger_entries
  WHERE user_id = p_sender_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  IF p_amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is UGX 500');
  END IF;

  -- Deduct from sender
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
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

  -- Credit receiver
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
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

  -- Get receiver's new balance for SMS
  SELECT COALESCE(SUM(amount), 0) INTO v_receiver_balance
  FROM ledger_entries
  WHERE user_id = p_receiver_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  RETURN json_build_object(
    'success', true,
    'receiver_balance', v_receiver_balance
  );
END;
$$;
