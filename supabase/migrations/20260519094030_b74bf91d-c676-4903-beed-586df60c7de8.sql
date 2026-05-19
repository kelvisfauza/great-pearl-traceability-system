
INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
SELECT
  '9355a7e6-8112-4598-81cd-d2897dda1fe0'::uuid,
  'DEPOSIT',
  30000,
  'SYSTEM_AWARD',
  'PD-20260519-MR-AIT3',
  jsonb_build_object(
    'awarded_by','Fauza Kusa 2',
    'employee_name','Masika Recheal',
    'reason','per diem (Ref: PD-20260519-MR-AIT3)',
    'ref_number','PD-20260519-MR-AIT3',
    'type','per_diem',
    'backfilled_at', now()::text,
    'backfill_reason','auth user did not exist when award was originally issued'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries WHERE reference = 'PD-20260519-MR-AIT3'
);
