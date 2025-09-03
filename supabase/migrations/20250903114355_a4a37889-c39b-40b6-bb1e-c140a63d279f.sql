-- Create employee record for Kelvis Fauza with all permissions
INSERT INTO public.employees (
  name,
  email,
  phone,
  position,
  department,
  role,
  permissions,
  salary,
  status,
  employee_id,
  auth_user_id,
  created_at,
  updated_at
) VALUES (
  'Kelvis Fauza',
  'kelvifauza@gmail.com',
  '+256XXXXXXXXX',
  'System Administrator',
  'IT',
  'Administrator',
  ARRAY['Finance', 'HR', 'IT', 'Store', 'Quality Control', 'Procurement', 'Processing', 'Sales Marketing', 'Inventory', 'Reports', 'Data Analyst', 'Field Operations', 'Logistics', 'Milling'],
  1500000,
  'Active',
  'EMP001',
  '42f96d36-942d-4d63-8bd3-44f573bb1f37',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  permissions = EXCLUDED.permissions,
  role = EXCLUDED.role,
  position = EXCLUDED.position,
  department = EXCLUDED.department,
  salary = EXCLUDED.salary,
  status = EXCLUDED.status,
  auth_user_id = EXCLUDED.auth_user_id,
  updated_at = now();