INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  '5ac019de-199c-4a3f-97de-96de786f55dc',
  'ADJUSTMENT',
  -170000,
  'SYSTEM_AWARD',
  'SAL-REVERSAL-2026-05-bdb0cc7f-6636-42e6-a8fb-a925e51d1c03',
  jsonb_build_object(
    'description', 'May 2026 salary clawback - employee did not work; net retained UGX 20,000',
    'related_salary_ref', 'SAL-7e6c5ff7-216c-4c51-8d1f-42cb68448697',
    'employee_id', 'bdb0cc7f-6636-42e6-a8fb-a925e51d1c03',
    'email', 'sserunkumataufiq@greatpearlcoffee.com',
    'reversed_by', 'admin_manual',
    'bypass_treasury_check', true,
    'type', 'salary_reversal'
  )
);