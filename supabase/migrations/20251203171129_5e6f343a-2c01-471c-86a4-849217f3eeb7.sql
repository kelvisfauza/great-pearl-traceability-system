-- Restrict Kibaba to Finance and Quality Control access only (not admin)
UPDATE public.employees
SET
  role = 'User',
  permissions = ARRAY[
    'Dashboard:view',
    'Finance:view', 'Finance:create', 'Finance:edit', 'Finance:process', 'Finance:approve',
    'Quality Control:view', 'Quality Control:create', 'Quality Control:edit', 'Quality Control:process',
    'Reports:view'
  ],
  updated_at = now()
WHERE email = 'nicholusscottlangz@gmail.com';