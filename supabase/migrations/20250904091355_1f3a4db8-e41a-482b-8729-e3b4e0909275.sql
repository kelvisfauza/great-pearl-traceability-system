-- Update Timothy's permissions to include Finance
UPDATE public.employees 
SET 
  permissions = ARRAY['Human Resources', 'Reports', 'Finance'],
  department = 'Finance',
  updated_at = now()
WHERE email = 'tatwanzire@gmail.com';