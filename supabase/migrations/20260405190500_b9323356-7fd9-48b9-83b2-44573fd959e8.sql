
-- 1. Create the approved salary advance record
INSERT INTO employee_salary_advances (
  employee_email, employee_name, original_amount, remaining_balance, 
  minimum_payment, reason, created_by, status
) VALUES (
  'bwambalebenson@greatpearlcoffee.com',
  'Bwambale Benson',
  120000,
  120000,
  40000,
  'Cash salary advance - approved by Finance (Fauza)',
  'fauzakusa@greatpearlcoffee.com',
  'active'
);

-- 2. Create the approval request (fully approved)
INSERT INTO approval_requests (
  type, title, description, amount, requestedby, requestedby_name,
  requestedby_position, department, daterequested, priority, status,
  approval_stage, finance_approved, finance_approved_at, finance_approved_by,
  admin_approved, admin_approved_at, admin_approved_by,
  details
) VALUES (
  'Salary Advance',
  'Salary Advance Request - Bwambale Benson',
  'Cash salary advance - approved by Finance (Fauza). Minimum Monthly Payment: UGX 40,000',
  120000,
  'fauzakusa@greatpearlcoffee.com',
  'Fauza Kusa',
  'Finance Manager',
  'EUDR Documentation',
  CURRENT_DATE,
  'High',
  'Approved',
  'completed',
  true,
  NOW(),
  'Fauza Kusa',
  true,
  NOW(),
  'Fauza Kusa',
  jsonb_build_object(
    'advance_type', 'salary_advance',
    'employee_email', 'bwambalebenson@greatpearlcoffee.com',
    'employee_name', 'Bwambale Benson',
    'employee_department', 'EUDR Documentation',
    'employee_position', 'office attendant',
    'advance_amount', 120000,
    'minimum_payment', 40000,
    'reason', 'Cash salary advance'
  )
);

-- 3. Credit wallet with the advance amount
INSERT INTO ledger_entries (
  user_id, entry_type, amount, reference, metadata
) VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'DEPOSIT',
  120000,
  'SALARY-ADVANCE-BENSON-' || to_char(NOW(), 'YYYYMMDD'),
  jsonb_build_object(
    'source', 'salary_advance',
    'description', 'Salary Advance Credit - UGX 120,000',
    'employee_name', 'Bwambale Benson',
    'approved_by', 'Fauza Kusa',
    'source_category', 'LOAN_DISBURSEMENT'
  )
);

-- 4. Create cash withdrawal (since cash was already given)
INSERT INTO ledger_entries (
  user_id, entry_type, amount, reference, metadata
) VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'WITHDRAWAL',
  -120000,
  'CASH-WD-BENSON-' || to_char(NOW(), 'YYYYMMDD'),
  jsonb_build_object(
    'source', 'cash_withdrawal',
    'description', 'Cash Withdrawal - Salary Advance Disbursement',
    'disbursement_method', 'Cash',
    'processed_by', 'Fauza Kusa',
    'source_category', 'WITHDRAWAL'
  )
);

-- 5. Create a successful withdrawal approval request
INSERT INTO approval_requests (
  type, title, description, amount, requestedby, requestedby_name,
  requestedby_position, department, daterequested, priority, status,
  approval_stage, finance_approved, finance_approved_at, finance_approved_by,
  admin_approved, admin_approved_at, admin_approved_by,
  payment_method, details
) VALUES (
  'Cash Withdrawal',
  'Cash Withdrawal - Bwambale Benson (Salary Advance)',
  'Cash disbursement of salary advance - UGX 120,000',
  120000,
  'bwambalebenson@greatpearlcoffee.com',
  'Bwambale Benson',
  'office attendant',
  'EUDR Documentation',
  CURRENT_DATE,
  'Medium',
  'Approved',
  'completed',
  true,
  NOW(),
  'Fauza Kusa',
  true,
  NOW(),
  'Fauza Kusa',
  'Cash',
  jsonb_build_object(
    'employee_email', 'bwambalebenson@greatpearlcoffee.com',
    'employee_name', 'Bwambale Benson',
    'withdrawal_type', 'salary_advance_disbursement',
    'method', 'Cash'
  )
);
