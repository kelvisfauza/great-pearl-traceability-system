-- Credit Timothy's wallet for the approved salary advance (04c2b248) that didn't trigger
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '6a1a2e65-4d07-4e0d-a016-34143297caaa',
  'DEPOSIT',
  50000,
  'SALARY-ADVANCE-04c2b248-4e47-4449-a94d-3a8b1e4c2e14',
  'SALARY',
  '{"description": "Salary Advance credit - manual fix", "approval_id": "04c2b248-4e47-4449-a94d-3a8b1e4c2e14", "employee_name": "Artwanzire Timothy"}'::jsonb
);