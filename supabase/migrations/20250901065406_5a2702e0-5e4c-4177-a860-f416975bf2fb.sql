-- Delete Kibaba's employee record
DELETE FROM employees WHERE email = 'nicholusscottlangz@gmail.com';

-- Create new Kibaba with proper permissions
INSERT INTO employees (
  name,
  email,
  phone,
  position,
  department,
  salary,
  role,
  permissions,
  status,
  join_date,
  auth_user_id,
  created_at,
  updated_at
) VALUES (
  'Kibaba Nicholus',
  'nicholusscottlangz@gmail.com',
  '+256700000000',
  'Quality Control Specialist',
  'Quality Control',
  800000,
  'Manager',
  ARRAY['Quality Control', 'Milling', 'Reports', 'Store Management', 'Inventory', 'General Access', 'User Management', 'Finance'],
  'Active',
  now(),
  '5fe8c99d-ee15-484d-8765-9bd4b37f961f',
  now(),
  now()
);