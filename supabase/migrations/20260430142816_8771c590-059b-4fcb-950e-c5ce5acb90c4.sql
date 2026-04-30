-- Backfill paired ledger entries for Timothy's UGX 3,500 USSD loan repayment
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  '010f057a-92e3-479d-89b2-a801ef851949'::uuid,
  'DEPOSIT',
  3500,
  'LOAN-MOMO-IN-273090bb-1777557863997',
  'LOAN_REPAYMENT',
  jsonb_build_object(
    'description', 'MoMo received from 256773318456 for loan repayment (manual backfill)',
    'phone', '256773318456',
    'loan_id', '273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd',
    'ussd_reference', 'USSD-SVC-1777557863997-4560',
    'source', 'mobile_money',
    'provider', 'yo_payments',
    'manual_backfill', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE metadata->>'ussd_reference' = 'USSD-SVC-1777557863997-4560' AND entry_type = 'DEPOSIT'
);

INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  '010f057a-92e3-479d-89b2-a801ef851949'::uuid,
  'LOAN_REPAYMENT',
  -3500,
  'LOAN-MOMO-REPAY-273090bb-1777557863997',
  'LOAN_REPAYMENT',
  jsonb_build_object(
    'description', 'Loan repayment via USSD MoMo (manual backfill)',
    'phone', '256773318456',
    'loan_id', '273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd',
    'ussd_reference', 'USSD-SVC-1777557863997-4560',
    'manual_backfill', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE metadata->>'ussd_reference' = 'USSD-SVC-1777557863997-4560' AND entry_type = 'LOAN_REPAYMENT'
);

-- Re-enable 1-minute reconciler cron (alter schedule auto-activates)
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'reconcile-ussd-deposits'),
  schedule := '* * * * *'
);