-- Credit Denis wallet (Employee of the Month March 2026)
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '7cdf79bf-c024-4107-98a7-3d84dbf0e975',
  'DEPOSIT',
  50000,
  'EOTM-MAR2026-RANK1-DENIS',
  'SYSTEM_AWARD',
  '{"reason": "Employee of the Month Reward - March 2026 (#1 Rank)", "employee_name": "Bwambale Denis"}'::jsonb
);

-- Credit Morjalia wallet (Employee of the Month March 2026)
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '60fa7376-53ee-4804-9b6c-0eefccd3fc9c',
  'DEPOSIT',
  50000,
  'EOTM-MAR2026-RANK2-MORJALIA',
  'SYSTEM_AWARD',
  '{"reason": "Employee of the Month Reward - March 2026 (#2 Rank)", "employee_name": "Morjalia Jadens"}'::jsonb
);

-- Mark EOTM records as bonus_awarded
UPDATE employee_of_the_month SET bonus_awarded = true WHERE is_active = true AND month = 3 AND year = 2026;