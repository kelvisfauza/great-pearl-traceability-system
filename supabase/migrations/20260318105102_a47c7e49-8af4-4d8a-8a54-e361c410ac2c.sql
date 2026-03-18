-- Add partial reversal tracking columns to transfer_reversal_requests
ALTER TABLE public.transfer_reversal_requests
  ADD COLUMN IF NOT EXISTS reversed_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_remainder numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_partial boolean DEFAULT false;

-- Replace approve_transfer_reversal with partial reversal support
CREATE OR REPLACE FUNCTION public.approve_transfer_reversal(p_request_id text, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_admin_email TEXT;
  v_reversal_ref TEXT;
  v_sender_phone TEXT;
  v_receiver_phone TEXT;
  v_receiver_balance NUMERIC;
  v_refund_amount NUMERIC;
  v_remainder NUMERIC;
  v_is_partial BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email INTO v_admin_email
  FROM employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.status = 'Active'
    AND e.role IN ('Administrator', 'Super Admin')
  LIMIT 1;

  IF v_admin_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_request
  FROM transfer_reversal_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already ' || v_request.status);
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger_entries
    WHERE id = v_request.ledger_entry_id
      AND (metadata->>'reversed') = 'true'
  ) THEN
    UPDATE transfer_reversal_requests
    SET status = 'rejected', reviewed_at = now(), reviewed_by = v_admin_email, review_notes = 'Already reversed'
    WHERE id = p_request_id;
    RETURN json_build_object('success', false, 'error', 'Transfer was already reversed');
  END IF;

  -- Check receiver's current wallet balance
  SELECT COALESCE(SUM(le.amount), 0) INTO v_receiver_balance
  FROM ledger_entries le
  WHERE le.user_id = v_request.receiver_user_id
    AND le.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  -- Determine refund amount based on receiver's balance
  IF v_receiver_balance <= 0 THEN
    -- Receiver has no money at all - reject
    UPDATE transfer_reversal_requests
    SET status = 'rejected', reviewed_at = now(), reviewed_by = v_admin_email,
        review_notes = COALESCE(p_notes, '') || ' [Auto: Receiver balance is ' || trim(to_char(v_receiver_balance, '999,999,999')) || ' UGX - insufficient for reversal]'
    WHERE id = p_request_id;
    RETURN json_build_object('success', false, 'error', 'Receiver wallet balance is ' || trim(to_char(v_receiver_balance, '999,999,999')) || ' UGX. Cannot reverse at this time.');
  ELSIF v_receiver_balance < v_request.amount THEN
    -- Partial reversal
    v_refund_amount := v_receiver_balance;
    v_remainder := v_request.amount - v_receiver_balance;
    v_is_partial := true;
  ELSE
    -- Full reversal
    v_refund_amount := v_request.amount;
    v_remainder := 0;
  END IF;

  v_reversal_ref := 'REVERSAL-' || v_request.tx_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  SELECT e.phone INTO v_sender_phone FROM employees e WHERE lower(e.email) = lower(v_request.sender_email) LIMIT 1;
  SELECT e.phone INTO v_receiver_phone FROM employees e WHERE lower(e.email) = lower(v_request.receiver_email) LIMIT 1;

  -- Credit sender with refund amount
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_request.sender_user_id,
    'DEPOSIT',
    v_refund_amount,
    v_reversal_ref || '-REFUND',
    jsonb_build_object(
      'type', 'transfer_reversal',
      'original_tx_id', v_request.tx_id,
      'reversed_by', v_admin_email,
      'initiated_by', 'sender',
      'reason', v_request.reason,
      'from_name', v_request.receiver_name,
      'from_email', v_request.receiver_email,
      'is_partial', v_is_partial,
      'refunded_amount', v_refund_amount,
      'pending_remainder', v_remainder,
      'description', CASE WHEN v_is_partial 
        THEN 'Partial Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded (UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending)'
        ELSE 'Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded'
      END
    )
  );

  -- Debit receiver
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_request.receiver_user_id,
    'WITHDRAWAL',
    -v_refund_amount,
    v_reversal_ref || '-DEBIT',
    jsonb_build_object(
      'type', 'transfer_reversal',
      'original_tx_id', v_request.tx_id,
      'reversed_by', v_admin_email,
      'initiated_by', 'sender',
      'reason', v_request.reason,
      'to_name', v_request.sender_name,
      'to_email', v_request.sender_email,
      'is_partial', v_is_partial,
      'deducted_amount', v_refund_amount,
      'pending_remainder', v_remainder,
      'description', CASE WHEN v_is_partial
        THEN 'Partial Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' deducted (UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending)'
        ELSE 'Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' deducted'
      END
    )
  );

  -- Mark original transfer entries as reversed
  UPDATE ledger_entries
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'reversed', CASE WHEN v_is_partial THEN 'partial' ELSE 'true' END,
    'reversed_by', v_admin_email,
    'reversed_at', now()::text,
    'reversal_reason', v_request.reason,
    'reversed_amount', v_refund_amount,
    'pending_remainder', v_remainder
  )
  WHERE reference LIKE '%' || v_request.tx_id || '%'
    AND (metadata->>'type') = 'wallet_transfer';

  -- Update request status
  UPDATE transfer_reversal_requests
  SET status = CASE WHEN v_is_partial THEN 'partial' ELSE 'approved' END,
      reviewed_at = now(),
      reviewed_by = v_admin_email,
      review_notes = COALESCE(p_notes, ''),
      reversed_amount = v_refund_amount,
      pending_remainder = v_remainder,
      is_partial = v_is_partial
  WHERE id = p_request_id;

  -- SMS notifications
  INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type, reference_id)
  VALUES
  (
    COALESCE(v_sender_phone, ''),
    v_request.sender_email,
    CASE WHEN v_is_partial
      THEN 'Dear ' || COALESCE(v_request.sender_name, 'User') || ', PARTIAL reversal approved for UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' of ' || trim(to_char(v_request.amount, '999,999,999')) || ' (sent to ' || COALESCE(v_request.receiver_name, 'Unknown') || '). UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' remains pending. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
      ELSE 'Dear ' || COALESCE(v_request.sender_name, 'User') || ', your reversal request for UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' (sent to ' || COALESCE(v_request.receiver_name, 'Unknown') || ') has been APPROVED. Funds returned to your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
    END,
    'transfer_reversal',
    NULL
  ),
  (
    COALESCE(v_receiver_phone, ''),
    v_request.receiver_email,
    CASE WHEN v_is_partial
      THEN 'Dear ' || COALESCE(v_request.receiver_name, 'User') || ', UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' has been reversed from your wallet (partial reversal of ' || trim(to_char(v_request.amount, '999,999,999')) || ' from ' || COALESCE(v_request.sender_name, 'Unknown') || '). UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' will be deducted when funds are available. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
      ELSE 'Dear ' || COALESCE(v_request.receiver_name, 'User') || ', a transfer of UGX ' || trim(to_char(v_request.amount, '999,999,999')) || ' from ' || COALESCE(v_request.sender_name, 'Unknown') || ' has been REVERSED by admin. Amount deducted from your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
    END,
    'transfer_reversal',
    NULL
  );

  RETURN json_build_object(
    'success', true,
    'reversal_ref', v_reversal_ref,
    'amount', v_request.amount,
    'refunded_amount', v_refund_amount,
    'pending_remainder', v_remainder,
    'is_partial', v_is_partial,
    'sender_name', v_request.sender_name,
    'receiver_name', v_request.receiver_name,
    'receiver_balance', v_receiver_balance,
    'message', CASE WHEN v_is_partial
      THEN 'Partial reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded. UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending until receiver has funds.'
      ELSE 'Reversal approved. Both parties notified.'
    END
  );
END;
$$;

-- Replace reverse_wallet_transfer (admin-initiated) with partial reversal support
CREATE OR REPLACE FUNCTION public.reverse_wallet_transfer(p_ledger_entry_id text, p_admin_reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
  v_receiver_balance NUMERIC;
  v_refund_amount NUMERIC;
  v_remainder NUMERIC;
  v_is_partial BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT e.email INTO v_admin_email
  FROM employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.status = 'Active'
    AND e.role IN ('Administrator', 'Super Admin')
  LIMIT 1;

  IF v_admin_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_entry FROM ledger_entries WHERE id = p_ledger_entry_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Entry not found');
  END IF;

  v_meta := CASE
    WHEN v_entry.metadata IS NULL THEN '{}'::jsonb
    WHEN jsonb_typeof(v_entry.metadata) = 'object' THEN v_entry.metadata
    ELSE '{}'::jsonb
  END;

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

  -- Check receiver's current wallet balance
  SELECT COALESCE(SUM(le.amount), 0) INTO v_receiver_balance
  FROM ledger_entries le
  WHERE le.user_id = v_receiver_user_id
    AND le.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  IF v_receiver_balance <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Receiver wallet balance is ' || trim(to_char(v_receiver_balance, '999,999,999')) || ' UGX. Cannot reverse at this time.', 'receiver_balance', v_receiver_balance);
  ELSIF v_receiver_balance < v_amount THEN
    v_refund_amount := v_receiver_balance;
    v_remainder := v_amount - v_receiver_balance;
    v_is_partial := true;
  ELSE
    v_refund_amount := v_amount;
    v_remainder := 0;
  END IF;

  v_reversal_ref := 'REVERSAL-' || v_tx_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Credit sender
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_sender_user_id, 'DEPOSIT', v_refund_amount, v_reversal_ref || '-REFUND',
    jsonb_build_object(
      'type', 'transfer_reversal', 'original_tx_id', v_tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'admin', 'reason', p_admin_reason,
      'from_name', v_receiver_name, 'from_email', v_receiver_email,
      'is_partial', v_is_partial, 'refunded_amount', v_refund_amount, 'pending_remainder', v_remainder,
      'description', CASE WHEN v_is_partial
        THEN 'Partial Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded (UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending)'
        ELSE 'Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded'
      END
    )
  );

  -- Debit receiver
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_receiver_user_id, 'WITHDRAWAL', -v_refund_amount, v_reversal_ref || '-DEBIT',
    jsonb_build_object(
      'type', 'transfer_reversal', 'original_tx_id', v_tx_id, 'reversed_by', v_admin_email,
      'initiated_by', 'admin', 'reason', p_admin_reason,
      'to_name', v_sender_name, 'to_email', v_sender_email,
      'is_partial', v_is_partial, 'deducted_amount', v_refund_amount, 'pending_remainder', v_remainder,
      'description', CASE WHEN v_is_partial
        THEN 'Partial Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' deducted (UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending)'
        ELSE 'Reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' deducted'
      END
    )
  );

  -- Mark original entries
  UPDATE ledger_entries
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'reversed', CASE WHEN v_is_partial THEN 'partial' ELSE 'true' END,
    'reversed_by', v_admin_email, 'reversed_at', now()::text,
    'reversal_reason', p_admin_reason, 'reversed_amount', v_refund_amount, 'pending_remainder', v_remainder
  )
  WHERE reference LIKE '%' || v_tx_id || '%'
    AND (metadata->>'type') = 'wallet_transfer';

  -- Track in reversal requests table
  UPDATE transfer_reversal_requests
  SET status = CASE WHEN v_is_partial THEN 'partial' ELSE 'approved' END,
      reviewed_at = now(), reviewed_by = v_admin_email,
      reversed_amount = v_refund_amount, pending_remainder = v_remainder, is_partial = v_is_partial
  WHERE tx_id = v_tx_id AND status = 'pending';

  -- SMS notifications
  INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type, reference_id)
  VALUES
  (
    COALESCE(v_sender_phone, ''), v_sender_email,
    CASE WHEN v_is_partial
      THEN 'Dear ' || COALESCE(v_sender_name, 'User') || ', PARTIAL reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' of ' || trim(to_char(v_amount, '999,999,999')) || ' refunded to your wallet. UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
      ELSE 'Dear ' || COALESCE(v_sender_name, 'User') || ', reversal of UGX ' || trim(to_char(v_amount, '999,999,999')) || ' approved. Funds returned to your wallet. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
    END,
    'transfer_reversal', NULL
  ),
  (
    COALESCE(v_receiver_phone, ''), v_receiver_email,
    CASE WHEN v_is_partial
      THEN 'Dear ' || COALESCE(v_receiver_name, 'User') || ', UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' reversed from your wallet (partial). UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' will be deducted when funds are available. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
      ELSE 'Dear ' || COALESCE(v_receiver_name, 'User') || ', UGX ' || trim(to_char(v_amount, '999,999,999')) || ' reversed from your wallet by admin. Reason: ' || p_admin_reason || '. Ref: ' || v_reversal_ref || ' - Great Pearl Coffee'
    END,
    'transfer_reversal', NULL
  );

  RETURN json_build_object(
    'success', true, 'reversal_ref', v_reversal_ref,
    'amount', v_amount, 'refunded_amount', v_refund_amount,
    'pending_remainder', v_remainder, 'is_partial', v_is_partial,
    'receiver_balance', v_receiver_balance,
    'sender_name', v_sender_name, 'receiver_name', v_receiver_name,
    'message', CASE WHEN v_is_partial
      THEN 'Partial reversal: UGX ' || trim(to_char(v_refund_amount, '999,999,999')) || ' refunded. UGX ' || trim(to_char(v_remainder, '999,999,999')) || ' pending.'
      ELSE 'Full reversal completed. Both parties notified.'
    END
  );
END;
$$;