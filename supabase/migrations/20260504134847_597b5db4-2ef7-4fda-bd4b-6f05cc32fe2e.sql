DO $$
DECLARE
  v_already INT;
BEGIN
  SELECT COUNT(*) INTO v_already FROM public.ledger_entries
   WHERE reference IN ('REVERSAL-SEND-1777900901051-XIQS-OUT','REVERSAL-SEND-1777900901051-XIQS-IN');
  IF v_already > 0 THEN
    RAISE NOTICE 'Reversal already applied, skipping.';
    RETURN;
  END IF;

  -- Refund Benson (sender)
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    'eba97d3e-f098-467a-ad78-d0b9639d76a8',
    'DEPOSIT',
    10000,
    'REVERSAL-SEND-1777900901051-XIQS-OUT',
    'SYSTEM_AWARD',
    jsonb_build_object(
      'type','wallet_transfer_reversal',
      'reverses','SEND-1777900901051-XIQS-OUT-80d8ae04',
      'reason','Sender had active loan; transfer violated 10k minimum balance rule',
      'description','Reversal: refund of UGX 10,000 transfer to Sserunkuma Taufiq (loan minimum balance rule)'
    )
  );

  -- Debit Taufiq (receiver)
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    '5ac019de-199c-4a3f-97de-96de786f55dc',
    'WITHDRAWAL',
    -10000,
    'REVERSAL-SEND-1777900901051-XIQS-IN',
    'WITHDRAWAL',
    jsonb_build_object(
      'type','wallet_transfer_reversal',
      'reverses','SEND-1777900901051-XIQS-IN-d093bbef',
      'reason','Sender had active loan; transfer violated 10k minimum balance rule',
      'description','Reversal: UGX 10,000 received from Bwambale Benson reversed (loan minimum balance rule)'
    )
  );
END $$;