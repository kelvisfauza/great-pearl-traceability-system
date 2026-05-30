INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  '5ac019de-199c-4a3f-97de-96de786f55dc',
  'DEPOSIT',
  50000,
  'SALARY',
  'admin-salary-payout-sseru-' || extract(epoch from now())::bigint::text,
  jsonb_build_object(
    'description', 'Salary payout – UGX 50,000',
    'source', 'salary_payout',
    'employee_id', 'bdb0cc7f-6636-42e6-a8fb-a925e51d1c03',
    'employee_name', 'Bbosa Taufiq',
    'email', 'sserunkumataufiq@greatpearlcoffee.com',
    'issued_by', 'admin_manual',
    'bypass_treasury_check', true
  )
);