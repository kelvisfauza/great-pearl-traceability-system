INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '5ac019de-199c-4a3f-97de-96de786f55dc',
  'WITHDRAWAL',
  -110000,
  'CASH-WD-BBOSA-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  'WITHDRAWAL',
  jsonb_build_object(
    'type', 'admin_cash_withdrawal',
    'source', 'CASH',
    'description', 'Cash withdrawal handed to employee by admin',
    'method', 'Cash',
    'approved_by', 'Fauza Kusa',
    'employee_name', 'Bbosa Sserunkuma Taufiq',
    'department', 'Sales',
    'position', 'EUDR support'
  )
);