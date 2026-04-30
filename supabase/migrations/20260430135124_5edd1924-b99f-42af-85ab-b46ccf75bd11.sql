DO $$
DECLARE
  v_user_id text;
BEGIN
  v_user_id := public.get_unified_user_id('fauzakusa@greatpearlcoffee.com')::text;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve user_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ledger_entries
    WHERE user_id::text = v_user_id
      AND reference = 'USSD-DEPOSIT-USSD-SVC-1777550381359-1OUL'
  ) THEN
    RAISE NOTICE 'Already reconciled';
    RETURN;
  END IF;

  INSERT INTO public.ledger_entries (
    user_id, entry_type, amount, reference, source_category, metadata
  ) VALUES (
    v_user_id::uuid,
    'DEPOSIT',
    450000,
    'USSD-DEPOSIT-USSD-SVC-1777550381359-1OUL',
    'SELF_DEPOSIT',
    jsonb_build_object(
      'type', 'ussd_wallet_deposit',
      'description', 'USSD wallet deposit from 256781121639 (manual reconciliation - IPN logged success but ledger credit was missing)',
      'phone', '256781121639',
      'caller_phone', '256781121639',
      'employee_id', 'ba816db1-ad13-486e-8754-17a6abd11532',
      'employee_email', 'fauzakusa@greatpearlcoffee.com',
      'ussd_reference', 'USSD-SVC-1777550381359-1OUL',
      'source', 'mobile_money',
      'provider', 'yo_payments',
      'reconciled_at', now()::text,
      'reconciled_by', 'system'
    )
  );
END $$;