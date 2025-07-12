
-- Insert the first admin user account with all permissions
INSERT INTO public.employees (
  name,
  email,
  position,
  department,
  role,
  permissions,
  salary,
  status
) VALUES (
  'Operations Manager',
  'kelvifauza@gmail.com',
  'Operations Manager',
  'Operations',
  'Administrator',
  ARRAY[
    'Procurement',
    'Quality Control', 
    'Processing',
    'Store Management',
    'Inventory',
    'Sales & Marketing',
    'Finance',
    'Field Operations',
    'Human Resources',
    'Data Analysis',
    'Reports',
    'Logistics'
  ],
  0,
  'Active'
);
