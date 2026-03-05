
-- Updated: Allow sender to reverse their own transfer (auto-reverse, no admin needed)
-- Also allow admin to reverse. Allow negative balances on receiver.
CREATE OR REPLACE FUNCTION public.reverse_wallet_transfer(
  p_ledger_entry_id UUID,
  p_admin_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_entry RECORD;
  v_meta JSONB;
  v_tx_id TEXT;
  v_sender_user_id TEXT;
  v_receiver_user_id TEXT;
  v_amount NUMERIC;
  v_sender_name TEXT;
  v_receiver_name TEXT;
  v_sender_email TEXT;
  v_receiver_email TEXT;
  v_sender_phone TEXT;
  v_receiver_phone TEXT;
  v_caller_email TEXT;
  v_caller_role TEXT;
  v_caller_user_id TEXT;
  v_reversal_ref TEXT;
  v_is_admin BOOLEAN := false;
  v_is_sender BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Identify caller
  SELECT e.email, e.role, public.get_unified_user_id(e.email)
    INTO v_caller_email, v_caller_role, v_caller_user_id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.status = 'Active'
  LIMIT 1;

  IF v_caller_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  v_is_admin := v_caller_role IN ('Administrator', 'Super Admin');

  -- Get the ledger entry
  SELECT * INTO v_entry FROM public.ledger_entries WHERE id = p_ledger_entry_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ledger entry not found');
  END IF;

  v_meta := CASE WHEN v_entry.metadata IS NULL THEN '{}'::jsonb
                 WHEN jsonb_typeof(v_entry.metadata::jsonb) = 'object' THEN v_entry.metadata::jsonb
                 ELSE '{}'::jsonb END;

  IF v_meta->>'type' != 'wallet_transfer' THEN
    RETURN json_build_object('success', false, 'error', 'This entry is not a wallet transfer');
  END IF;

  IF v_meta->>'reversed' = 'true' THEN
    RETURN json_build_object('success', false, 'error', 'This transfer has already been reversed');
  END IF;

  v_tx_id := v_meta->>'tx_id';
  IF v_tx_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Transfer reference not found');
  END IF;

  -- Determine sender (negative amount) and receiver (positive amount)
  IF v_entry.amount < 0 THEN
    v_sender_user_id := v_entry.user_id;
    v_amount := ABS(v_entry.amount);
    v_receiver_email := v_meta->>'to_email';
    v_receiver_name := v_meta->>'to_name';
    SELECT e.name, e.email, e.phone INTO v_sender_name, v_sender_email, v_sender_phone
    FROM employees e WHERE public.get_unified_user_id(e.email) = v_sender_user_id LIMIT 1;
    v_receiver_user_id := public.get_unified_user_id(v_receiver_email);
    SELECT e.phone INTO v_receiver_phone FROM employees e WHERE lower(e.email) = lower(v_receiver_email) LIMIT 1;
  ELSE
    v_receiver_user_id := v_entry.user_id;
    v_amount := v_entry.amount;
    v_sender_email := v_meta->>'from_email';
    v_sender_name := v_meta->>'from_name';
    v_sender_user_id := public.get_unified_user_id(v_sender_email);
    SELECT e.name, e.email, e.phone INTO v_receiver_name, v_receiver_email, v_receiver_phone
    FROM employees e WHERE public.get_unified_user_id(e.email) = v_receiver_user_id LIMIT 1;
    SELECT e.phone INTO v_sender_phone FROM employees e WHERE lower(e.email) = lower(v_sender_email) LIMIT 1;
  END IF;

  -- Check authorization: must be the sender OR an admin
  v_is_sender := (v_caller_user_id = v_sender_user_id);
  IF NOT v_is_sender AND NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Only the sender or an administrator can reverse this transfer');
  END IF;

  IF v_sender_user_id IS NULL OR v_receiver_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Could not resolve sender/receiver accounts');
  END IF;

  v_reversal_ref := 'REVERSAL-' || v_tx_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Credit sender back (refund)
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_sender_user_id,
    'DEPOSIT',
    v_amount,
    v_reversal_ref || '-REFUND',
    jsonb_build_object(
      'type', 'transfer_reversal',
      'original_tx_id', v_tx_id,
      'reversed_by', v_caller_email,
      'initiated_by', CASE WHEN v_is_sender THEN 'sender' ELSE 'admin' END,
      'reason', p_admin_reason,
      'from_name', v_receiver_name,
      'from_email', v_receiver_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_amount, '999,999,999')) || ' refunded (sent to ' || v_receiver_name || ')'
    )
  );

  -- Debit receiver (can go negative)
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_receiver_user_id,
    'WITHDRAWAL',
    -v_amount,
    v_reversal_ref || '-DEBIT',
    jsonb_build_object(
      'type', 'transfer_reversal',
      'original_tx_id', v_tx_id,
      'reversed_by', v_caller_email,
      'initiated_by', CASE WHEN v_is_sender THEN 'sender' ELSE 'admin' END,
      'reason', p_admin_reason,
      'to_name', v_sender_name,
      'to_email', v_sender_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_amount, '999,999,999')) || ' deducted (received from ' || v_sender_name || ')'
    )
  );

  -- Mark original entries as reversed
  UPDATE public.ledger_entries
  SET metadata = COALESCE(metadata::jsonb, '{}'::jsonb) || jsonb_build_object('reversed', 'true', 'reversed_by', v_caller_email, 'reversed_at', now()::text, 'reversal_reason', p_admin_reason)
  WHERE reference LIKE '%' || v_tx_id || '%'
    AND (metadata::jsonb->>'type') = 'wallet_transfer';

  -- Notify both parties via SMS
  INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type, reference_id)
  VALUES
  (
    COALESCE(v_sender_phone, ''),
    v_sender_email,
    'Dear ' || COALESCE(v_sender_name, 'User') || ', your transfer of UGX ' || trim(to_char(v_amount, '999,999,999')) || ' to ' || COALESCE(v_receiver_name, 'Unknown') || ' has been REVERSED. The funds have been returned to your wallet. Reason: ' || COALESCE(p_admin_reason, 'Sender initiated') || '. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
    'transfer_reversal',
    v_reversal_ref
  ),
  (
    COALESCE(v_receiver_phone, ''),
    v_receiver_email,
    'Dear ' || COALESCE(v_receiver_name, 'User') || ', a transfer of UGX ' || trim(to_char(v_amount, '999,999,999')) || ' from ' || COALESCE(v_sender_name, 'Unknown') || ' has been REVERSED. The amount has been deducted from your wallet. Reason: ' || COALESCE(p_admin_reason, 'Sender initiated') || '. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
    'transfer_reversal',
    v_reversal_ref
  );

  RETURN json_build_object(
    'success', true,
    'reversal_ref', v_reversal_ref,
    'amount', v_amount,
    'sender_name', v_sender_name,
    'receiver_name', v_receiver_name,
    'initiated_by', CASE WHEN v_is_sender THEN 'sender' ELSE 'admin' END,
    'message', 'Transfer reversed successfully. Both parties have been notified via SMS.'
  );
END;
$function$;
