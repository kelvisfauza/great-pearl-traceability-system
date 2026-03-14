-- Create the salary advance record for Timothy's approved 50K advance
INSERT INTO employee_salary_advances (
  employee_email, employee_name, original_amount, remaining_balance, 
  minimum_payment, reason, created_by, status
) VALUES (
  'tatwanzire@greatpearlcoffee.com', 'Artwanzire Timothy', 50000, 50000,
  50000, 'Salary', 'fauzakusa@greatpearlcoffee.com', 'active'
);

-- Credit Timothy's wallet with the salary advance
INSERT INTO ledger_entries (
  user_id, entry_type, amount, reference, metadata
) VALUES (
  '010f057a-92e3-479d-89b2-a801ef851949',
  'DEPOSIT',
  50000,
  'SALARY-ADVANCE-APPROVED-2b4c54fd',
  '{"source": "salary_advance", "description": "Salary Advance Disbursement - Approved", "employee_name": "Artwanzire Timothy", "approval_id": "2b4c54fd-4ed5-4b0c-adfd-c498cd745237"}'::jsonb
);