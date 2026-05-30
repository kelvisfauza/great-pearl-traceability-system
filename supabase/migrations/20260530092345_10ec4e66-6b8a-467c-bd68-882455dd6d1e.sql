INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  '24edb593-8527-4ced-8225-f5df0d209ccf',
  'ADJUSTMENT',
  -100000,
  'SYSTEM_AWARD',
  'admin-salary-clawback-kibaba-' || extract(epoch from now())::bigint::text,
  jsonb_build_object(
    'description', 'Salary clawback – UGX 100,000 deducted due to reduced work output',
    'source', 'salary_reversal',
    'type', 'salary_reversal',
    'employee_id', '9c9f1e6c-a2f4-425e-a97c-622bc52c2e6a',
    'employee_name', 'Kibaba Nicholus',
    'email', 'nickscott@greatpearlcoffee.com',
    'reversed_by', 'admin_manual',
    'bypass_treasury_check', true
  )
);