-- Seed John's contract data
INSERT INTO public.employee_contracts (employee_id, employee_name, employee_email, employee_gac_id, contract_type, position, department, contract_start_date, contract_end_date, contract_duration_months, salary, status, notes, created_by)
VALUES (
  'b2fa0987-241a-486e-83ed-564aca47f354',
  'John Masereka',
  'johnmasereka@greatpearlcoffee.com',
  'GAC-0013',
  'Fixed-Term',
  'Field Extension & Crop Assessment Assistant',
  'Operations',
  '2026-02-10',
  '2026-08-10',
  6,
  250000,
  'Active',
  'Initial 6-month fixed-term contract. May be extended or converted to longer-term engagement subject to performance.',
  'System'
);