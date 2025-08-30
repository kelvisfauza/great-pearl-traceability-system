-- Create ledger entries for other employees using unique references
-- First, let's create entries with timestamps to ensure uniqueness

-- For employees who need account balances, using their names as temporary user_ids
-- Create entries with microsecond timestamps to avoid conflicts

-- For Kibaba Nicholus (salary: 300,000 UGX - daily: 10,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kibaba_nicholus_temp_id',
  'DAILY_SALARY',
  10000.00,
  'DAILY-KIBABA-' || generate_series || '-' || extract(epoch from now())::bigint,
  json_build_object(
    'employee_name', 'Kibaba Nicholus',
    'monthly_salary', 300000,
    'daily_rate', 10000,
    'credit_date', (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date
  ),
  (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Kusa Fauza (salary: 1,200,000 UGX - daily: 40,000)  
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kusa_fauza_temp_id',
  'DAILY_SALARY', 
  40000.00,
  'DAILY-KUSA-' || generate_series || '-' || extract(epoch from now())::bigint,
  json_build_object(
    'employee_name', 'Kusa Fauza',
    'monthly_salary', 1200000,
    'daily_rate', 40000,
    'credit_date', (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date
  ),
  (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For HR Manager (salary: 800,000 UGX - daily: 26,667)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'hr_manager_temp_id',
  'DAILY_SALARY',
  26667.00,
  'DAILY-HR-' || generate_series || '-' || extract(epoch from now())::bigint,
  json_build_object(
    'employee_name', 'HR Manager',
    'monthly_salary', 800000,
    'daily_rate', 26667,
    'credit_date', (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date
  ),
  (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Alex tumwine (salary: 300,000 UGX - daily: 10,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)  
SELECT 
  'alex_tumwine_temp_id',
  'DAILY_SALARY',
  10000.00,
  'DAILY-ALEX-' || generate_series || '-' || extract(epoch from now())::bigint,
  json_build_object(
    'employee_name', 'Alex tumwine',
    'monthly_salary', 300000,
    'daily_rate', 10000,
    'credit_date', (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date
  ),
  (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Fauza Kusa 2 (salary: 500,000 UGX - daily: 16,667)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'fauza_kusa2_temp_id',
  'DAILY_SALARY',
  16667.00,
  'DAILY-FAUZA2-' || generate_series || '-' || extract(epoch from now())::bigint,
  json_build_object(
    'employee_name', 'Fauza Kusa 2',
    'monthly_salary', 500000,
    'daily_rate', 16667,
    'credit_date', (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date
  ),
  (CURRENT_DATE - INTERVAL '29 days' + INTERVAL '1 day' * generate_series)::date + TIME '08:00:00'
FROM generate_series(0, 29);