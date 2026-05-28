-- Reverse wrong credit to Fauza (bypass treasury guard — internal correction, no money left the company)
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec',
  'REVERSAL',
  -100000,
  'REVERSAL-SALARY-ADVANCE-2c22f84d-misrouted',
  jsonb_build_object(
    'source', 'salary_advance_reversal',
    'type', 'reversal_mirror',
    'bypass_treasury_check', true,
    'request_id', '2c22f84d-e676-4b95-acfd-263113615cd7',
    'description', 'Reversal: Salary advance UGX 100,000 was misrouted to requester Fauza Kusa 2 instead of beneficiary Bwambale Benson. Funds now redirected to Benson.',
    'original_ledger_id', '925ad802-1dc5-42ad-a2c9-551a80ce41d1'
  )
);

-- Reassign the advance ledger record to Benson
UPDATE employee_salary_advances
SET employee_email = 'bwambalebenson@greatpearlcoffee.com',
    employee_name = 'Bwambale Benson',
    updated_at = NOW()
WHERE id = 'fef3ea20-1707-4a7f-964c-3b1b89ccbc2e';

-- Credit Benson's wallet with the corrected salary advance
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'DEPOSIT',
  100000,
  'SALARY-ADVANCE-2c22f84d-e676-4b95-acfd-263113615cd7-corrected',
  jsonb_build_object(
    'source', 'salary_advance',
    'request_id', '2c22f84d-e676-4b95-acfd-263113615cd7',
    'advance_id', 'fef3ea20-1707-4a7f-964c-3b1b89ccbc2e',
    'description', 'Salary Advance disbursement – UGX 100,000 (recoverable on 27th) – corrected routing to beneficiary',
    'employee_name', 'Bwambale Benson'
  )
);