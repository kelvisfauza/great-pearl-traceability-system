
-- Fix: approve_transfer_reversal and reverse_wallet_transfer insert text into uuid reference_id column
-- Solution: pass NULL for reference_id and put the ref in the message instead

CREATE OR REPLACE FUNCTION public.approve_transfer_reversal(p_request_id TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_admin_email TEXT;
  v_reversal_ref TEXT;
  v_sender_phone TEXT;
  v_receiver_phone TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email INTO v_admin_email
  FROM employees e WHERE e.auth_user_id = auth.uid() AND e.status = 'Active'
    AND e.role IN ('Administrator', 'Super Admin') LIMIT 1;
  IF v_admin_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_request FROM transfer_reversal_requests WHERE id = p_request_id::uuid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already ' || v_request.status);
  END IF;

  -- Check original not already reversed
  IF EXISTS (SELECT 1 FROM ledger_entries WHERE id = v_request.ledger_entry_id AND (metadata->>'reversed') = 'true') THEN
    UPDATE transfer_reversal_requests SET status = 'rejected', reviewed_at = now(), reviewed_by = v_admin_email, review_notes = 'Already reversed' WHERE id = p_request_id::uuid;
    RETURN json_build_object('success', false, 'error', 'Transfer was already reversed');
  END IF;

  v_reversal_ref := 'REVERSAL-' || v_request.tx_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  SELECT e.phone INTO v_sender_phone FROM employees e WHERE lower(e.email) = lower(v_request.sender_email) LIMIT 1;
  SELECT e.phone INTO v_receiver_phone FROM employees e WHERE lower(e.email) = lower(v_request.receiver_email) LIMIT 1;

  -- Credit sender
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (v_request.sender_user_id, 'DEPOSIT', v_request.amount, v_reversal_ref || '-REFUND',
    jsonb_build_object('type', 'transfer_reversal', 'original_tx_id', v_request.tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'sender', 'reason', v_request.reason, 'from_name', v_request.receiver_name, 'from_email', v_request.receiver_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' refunded'));

  -- Debit receiver (can go negative)
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (v_request.receiver_user_id, 'WITHDRAWAL', -v_request.amount, v_reversal_ref || '-DEBIT',
    jsonb_build_object('type', 'transfer_reversal', 'original_tx_id', v_request.tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'sender', 'reason', v_request.reason, 'to_name', v_request.sender_name, 'to_email', v_request.sender_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' deducted'));

  -- Mark originals
  UPDATE ledger_entries
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('reversed', 'true', 'reversed_by', v_admin_email, 'reversed_at', now()::text, 'reversal_reason', v_request.reason)
  WHERE reference LIKE '%' || v_request.tx_id || '%' AND (metadata->>'type') = 'wallet_transfer';

  -- Update request
  UPDATE transfer_reversal_requests SET status = 'approved', reviewed_at = now(), reviewed_by = v_admin_email, review_notes = COALESCE(p_notes, '') WHERE id = p_request_id::uuid;

  -- SMS both (reference_id is UUID, so pass NULL)
  INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type, reference_id) VALUES
  (COALESCE(v_sender_phone, ''), v_request.sender_email,
   'Dear ' || COALESCE(v_request.sender_name, 'User') || ', your reversal request for UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' (sent to ' || COALESCE(v_request.receiver_name, 'Unknown') || ') has been APPROVED. Funds returned to your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
   'transfer_reversal', NULL),
  (COALESCE(v_receiver_phone, ''), v_request.receiver_email,
   'Dear ' || COALESCE(v_request.receiver_name, 'User') || ', a transfer of UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' from ' || COALESCE(v_request.sender_name, 'Unknown') || ' has been REVERSED by admin. Amount deducted from your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
   'transfer_reversal', NULL);

  RETURN json_build_object('success', true, 'reversal_ref', v_reversal_ref, 'amount', v_request.amount,
    'sender_name', v_request.sender_name, 'receiver_name', v_request.receiver_name,
    'message', 'Reversal approved. Both parties notified.');
END;
$$;

-- Also fix reverse_wallet_transfer (admin direct reversal)
CREATE OR REPLACE FUNCTION public.reverse_wallet_transfer(p_ledger_entry_id TEXT, p_admin_reason TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_admin_email TEXT;
  v_reversal_ref TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email INTO v_admin_email
  FROM employees e
  WHERE e.auth_user_id = auth.uid() AND e.status = 'Active'
    AND e.role IN ('Administrator', 'Super Admin')
  LIMIT 1;

  IF v_admin_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_entry FROM ledger_entries WHERE id = p_ledger_entry_id::uuid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Entry not found');
  END IF;

  v_meta := CASE WHEN v_entry.metadata IS NULL THEN '{}'::jsonb
                 WHEN jsonb_typeof(v_entry.metadata) = 'object' THEN v_entry.metadata
                 ELSE '{}'::jsonb END;

  IF v_meta->>'type' != 'wallet_transfer' THEN
    RETURN json_build_object('success', false, 'error', 'Not a wallet transfer');
  END IF;
  IF v_meta->>'reversed' = 'true' THEN
    RETURN json_build_object('success', false, 'error', 'Already reversed');
  END IF;

  v_tx_id := v_meta->>'tx_id';

  IF v_entry.amount < 0 THEN
    v_sender_user_id := v_entry.user_id;
    v_amount := ABS(v_entry.amount);
    v_receiver_email := v_meta->>'to_email';
    v_receiver_name := v_meta->>'to_name';
    SELECT e.name, e.email, e.phone INTO v_sender_name, v_sender_email, v_sender_phone
    FROM employees e WHERE get_unified_user_id(e.email) = v_sender_user_id LIMIT 1;
    v_receiver_user_id := get_unified_user_id(v_receiver_email);
    SELECT e.phone INTO v_receiver_phone FROM employees e WHERE lower(e.email) = lower(v_receiver_email) LIMIT 1;
  ELSE
    v_receiver_user_id := v_entry.user_id;
    v_amount := v_entry.amount;
    v_sender_email := v_meta->>'from_email';
    v_sender_name := v_meta->>'from_name';
    v_sender_user_id := get_unified_user_id(v_sender_email);
    SELECT e.name, e.email, e.phone INTO v_receiver_name, v_receiver_email, v_receiver_phone
    FROM employees e WHERE get_unified_user_id(e.email) = v_receiver_user_id LIMIT 1;
    SELECT e.phone INTO v_sender_phone FROM employees e WHERE lower(e.email) = lower(v_sender_email) LIMIT 1;
  END IF;

  IF v_sender_user_id IS NULL OR v_receiver_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Could not resolve accounts');
  END IF;

  v_reversal_ref := 'REVERSAL-' || v_tx_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Credit sender
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (v_sender_user_id, 'DEPOSIT', v_amount, v_reversal_ref || '-REFUND',
    jsonb_build_object('type', 'transfer_reversal', 'original_tx_id', v_tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'admin', 'reason', p_admin_reason, 'from_name', v_receiver_name, 'from_email', v_receiver_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_amount, '999,999,999')) || ' refunded'));

  -- Debit receiver (can go negative)
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (v_receiver_user_id, 'WITHDRAWAL', -v_amount, v_reversal_ref || '-DEBIT',
    jsonb_build_object('type', 'transfer_reversal', 'original_tx_id', v_tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'admin', 'reason', p_admin_reason, 'to_name', v_sender_name, 'to_email', v_sender_email,
      'description', 'Reversal: UGX ' || trim(to_char(v_amount, '999,999,999')) || ' deducted'));

  -- Mark originals as reversed
  UPDATE ledger_entries
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('reversed', 'true', 'reversed_by', v_admin_email, 'reversed_at', now()::text, 'reversal_reason', p_admin_reason)
  WHERE reference LIKE '%' || v_tx_id || '%' AND (metadata->>'type') = 'wallet_transfer';

  -- Also mark any pending reversal requests as completed
  UPDATE transfer_reversal_requests SET status = 'approved', reviewed_at = now(), reviewed_by = v_admin_email, review_notes = p_admin_reason
  WHERE tx_id = v_tx_id AND status = 'pending';

  -- SMS both parties (reference_id is UUID, pass NULL)
  INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type, reference_id) VALUES
  (COALESCE(v_sender_phone, ''), COALESCE(v_sender_email, ''),
   'Dear ' || COALESCE(v_sender_name, 'User') || ', a transfer of UGX ' || trim(to_char(v_amount, '999,999,999')) || ' to ' || COALESCE(v_receiver_name, 'Unknown') || ' has been REVERSED. Funds returned to your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
   'transfer_reversal', NULL),
  (COALESCE(v_receiver_phone, ''), COALESCE(v_receiver_email, ''),
   'Dear ' || COALESCE(v_receiver_name, 'User') || ', a received transfer of UGX ' || trim(to_char(v_amount, '999,999,999')) || ' from ' || COALESCE(v_sender_name, 'Unknown') || ' has been REVERSED by admin. Amount deducted from your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee',
   'transfer_reversal', NULL);

  RETURN json_build_object('success', true, 'reversal_ref', v_reversal_ref, 'amount', v_amount,
    'sender_name', v_sender_name, 'receiver_name', v_receiver_name,
    'message', 'Transfer reversed successfully. Both parties notified.');
END;
$$;
