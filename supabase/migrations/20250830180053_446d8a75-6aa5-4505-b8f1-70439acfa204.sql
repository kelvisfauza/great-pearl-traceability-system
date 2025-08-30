-- Create ledger entries for other employees with unique references
-- Check current max timestamp to avoid duplicates and create unique entries

-- For Kibaba Nicholus (salary: 300,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kibaba_nicholus_temp_id',
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-kibaba-' || generate_series(0, 29),
  json_build_object(
    'employee_name', 'Kibaba Nicholus',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Kusa Fauza (salary: 1,200,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kusa_fauza_temp_id',
  'DAILY_SALARY',
  40000.00, -- 1,200,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-kusa-' || generate_series(0, 29),
  json_build_object(
    'employee_name', 'Kusa Fauza',
    'monthly_salary', 1200000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Admin User (salary: 300,000) - using their actual auth_user_id
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  '5fe8c99d-ee15-484d-8765-9bd4b37f961f',
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-admin-' || generate_series(0, 29),
  json_build_object(
    'employee_name', 'Admin User',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Artwanzire Timothy (salary: 300,000) - using their actual auth_user_id
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641',
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-artwanzire-' || generate_series(0, 29),
  json_build_object(
    'employee_name', 'Artwanzire Timothy',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For HR Manager (salary: 800,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'hr_manager_temp_id',
  'DAILY_SALARY',
  26666.67, -- 800,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-hr-' || generate_series(0, 29),
  json_build_object(
    'employee_name', 'HR Manager',
    'monthly_salary', 800000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);