
-- 1. Cash withdrawal #1: UGX 200,000
INSERT INTO ledger_entries (
  user_id, entry_type, amount, reference, metadata
) VALUES (
  '8b590bb1-6cda-47af-96e1-0c35d628a01c',
  'WITHDRAWAL',
  -200000,
  'CASH-WD-ALEX-200K-' || to_char(NOW(), 'YYYYMMDD'),
  jsonb_build_object(
    'source', 'cash_withdrawal',
    'description', 'Cash Withdrawal - UGX 200,000',
    'disbursement_method', 'Cash',
    'processed_by', 'Fauza Kusa',
    'source_category', 'WITHDRAWAL'
  )
);

-- 2. Cash withdrawal #2: UGX 50,000
INSERT INTO ledger_entries (
  user_id, entry_type, amount, reference, metadata
) VALUES (
  '8b590bb1-6cda-47af-96e1-0c35d628a01c',
  'WITHDRAWAL',
  -50000,
  'CASH-WD-ALEX-50K-' || to_char(NOW(), 'YYYYMMDD'),
  jsonb_build_object(
    'source', 'cash_withdrawal',
    'description', 'Cash Withdrawal - UGX 50,000',
    'disbursement_method', 'Cash',
    'processed_by', 'Fauza Kusa',
    'source_category', 'WITHDRAWAL'
  )
);

-- 3. Approved withdrawal request #1
INSERT INTO approval_requests (
  type, title, description, amount, requestedby, requestedby_name,
  requestedby_position, department, daterequested, priority, status,
  approval_stage, finance_approved, finance_approved_at, finance_approved_by,
  admin_approved, admin_approved_at, admin_approved_by,
  payment_method, details
) VALUES (
  'Cash Withdrawal',
  'Cash Withdrawal - Tumwine Alex (UGX 200,000)',
  'Cash withdrawal of UGX 200,000',
  200000,
  'tumwinealex@greatpearlcoffee.com',
  'Tumwine Alex',
  'EUDR',
  'Quality Control',
  CURRENT_DATE,
  'Medium',
  'Approved',
  'completed',
  true, NOW(), 'Fauza Kusa',
  true, NOW(), 'Fauza Kusa',
  'Cash',
  jsonb_build_object('employee_email', 'tumwinealex@greatpearlcoffee.com', 'employee_name', 'Tumwine Alex', 'method', 'Cash')
);

-- 4. Approved withdrawal request #2
INSERT INTO approval_requests (
  type, title, description, amount, requestedby, requestedby_name,
  requestedby_position, department, daterequested, priority, status,
  approval_stage, finance_approved, finance_approved_at, finance_approved_by,
  admin_approved, admin_approved_at, admin_approved_by,
  payment_method, details
) VALUES (
  'Cash Withdrawal',
  'Cash Withdrawal - Tumwine Alex (UGX 50,000)',
  'Cash withdrawal of UGX 50,000',
  50000,
  'tumwinealex@greatpearlcoffee.com',
  'Tumwine Alex',
  'EUDR',
  'Quality Control',
  CURRENT_DATE,
  'Medium',
  'Approved',
  'completed',
  true, NOW(), 'Fauza Kusa',
  true, NOW(), 'Fauza Kusa',
  'Cash',
  jsonb_build_object('employee_email', 'tumwinealex@greatpearlcoffee.com', 'employee_name', 'Tumwine Alex', 'method', 'Cash')
);
