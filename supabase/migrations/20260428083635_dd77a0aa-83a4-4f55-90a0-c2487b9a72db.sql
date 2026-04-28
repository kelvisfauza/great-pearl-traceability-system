DO $$
DECLARE
  v_uid text;
BEGIN
  SELECT public.get_unified_user_id('bwambaledenis@greatpearlcoffee.com')::text INTO v_uid;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Could not resolve unified user id for bwambaledenis@greatpearlcoffee.com';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ledger_entries
    WHERE user_id::text = v_uid
      AND metadata->>'original_ledger_id' = '38ce3e23-30c7-4d69-be41-6a87ee0bf0bf'
  ) THEN
    RAISE NOTICE 'Refund already exists — skipping';
  ELSE
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
    VALUES (
      v_uid::uuid,
      'DEPOSIT',
      35000,
      'REFUND-LOAN-MOMO-0cfd6cb5-' || extract(epoch from now())::bigint::text,
      jsonb_build_object(
        'description', 'Refund: MoMo loan repayment of UGX 35,000 wrongly debited from wallet on 2026-04-17',
        'source', 'admin_refund',
        'original_ledger_id', '38ce3e23-30c7-4d69-be41-6a87ee0bf0bf',
        'original_reference', 'LOAN-MOMO-REPAY-0cfd6cb5-8b16-4002-8e29-31cd65aaab0e-1776448564746',
        'loan_id', '0cfd6cb5-8b16-4002-8e29-31cd65aaab0e',
        'reason', 'MoMo loan repayment was charged to the wallet but no loan installment was credited.',
        'refunded_at', now()
      )
    );
  END IF;
END $$;