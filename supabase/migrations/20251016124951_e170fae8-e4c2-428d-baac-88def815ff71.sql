-- Update Timothy's permissions to view-only access
UPDATE public.employees 
SET 
  role = 'User',
  permissions = ARRAY[
    'Finance:view',
    'Reports:view', 
    'Data Analysis:view',
    'Field Operations:view',
    'Sales Marketing:view',
    'Logistics:view',
    'IT Management:view',
    'Milling:view',
    'Store Management:view',
    'Processing:view',
    'Inventory:view',
    'Quality Control:view',
    'Procurement:view',
    'Human Resources:view',
    'EUDR Documentation:view'
  ]
WHERE email = 'tatwanzire@gmail.com';