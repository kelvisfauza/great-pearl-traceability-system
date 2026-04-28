-- Refund Timothy (Artwanzire Timothy) for two MoMo loan repayments wrongly debited from his wallet.
-- Both MoMo payments are confirmed completed in mobile_money_transactions with valid Yo network refs.
-- The loan was correctly credited via Yo, but the wallet was also debited (bug fixed in gosentepay-callback).
DO $$
DECLARE
  v_uid uuid := '010f057a-92e3-479d-89b2-a801ef851949';
  v_already_refunded_1 int;
  v_already_refunded_2 int;
BEGIN
  -- Refund #1: UGX 120,000 (original ledger e6eae1d9-3939-4283-b3bc-c4467f50fc51)
  SELECT count(*) INTO v_already_refunded_1
  FROM public.ledger_entries
  WHERE metadata->>'original_ledger_id' = 'e6eae1d9-3939-4283-b3bc-c4467f50fc51';

  IF v_already_refunded_1 = 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
    VALUES (
      v_uid,
      'DEPOSIT',
      120000,
      'REFUND-LOAN-MOMO-273090bb-1-' || extract(epoch from now())::bigint,
      jsonb_build_object(
        'description', 'Refund: MoMo loan repayment of UGX 120,000 wrongly debited from wallet on 2026-04-26 (Yo confirmed payment, wallet should not have been charged).',
        'original_ledger_id', 'e6eae1d9-3939-4283-b3bc-c4467f50fc51',
        'momo_transaction_ref', 'LOANREPAY-273090bb-1777206940168',
        'yo_network_ref', '40254282947',
        'reason', 'MoMo direct loan repayment double-charged the wallet. Corrected per paired-entry policy.'
      )
    );
  END IF;

  -- Refund #2: UGX 39,500 (original ledger 64d69ca5-fd59-4ea0-813c-d68dc4caabde)
  SELECT count(*) INTO v_already_refunded_2
  FROM public.ledger_entries
  WHERE metadata->>'original_ledger_id' = '64d69ca5-fd59-4ea0-813c-d68dc4caabde';

  IF v_already_refunded_2 = 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
    VALUES (
      v_uid,
      'DEPOSIT',
      39500,
      'REFUND-LOAN-MOMO-273090bb-2-' || extract(epoch from now())::bigint,
      jsonb_build_object(
        'description', 'Refund: MoMo loan repayment of UGX 39,500 wrongly debited from wallet on 2026-04-27 (Yo confirmed payment, wallet should not have been charged).',
        'original_ledger_id', '64d69ca5-fd59-4ea0-813c-d68dc4caabde',
        'momo_transaction_ref', 'LOANREPAY-273090bb-1777311073670',
        'yo_network_ref', '40286891346',
        'reason', 'MoMo direct loan repayment double-charged the wallet. Corrected per paired-entry policy.'
      )
    );
  END IF;
END $$;