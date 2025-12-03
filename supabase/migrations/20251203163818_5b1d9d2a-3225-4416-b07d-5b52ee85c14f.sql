-- Update Timothy's role to Administrator and add IT Management permissions
UPDATE public.employees 
SET 
  role = 'Administrator',
  permissions = ARRAY[
    'Finance:view', 'Reports:view', 'Data Analysis:view', 'Field Operations:view', 
    'Sales Marketing:view', 'Logistics:view', 'IT Management:view', 'Milling:view', 
    'Store Management:view', 'Processing:view', 'Inventory:view', 'Quality Control:view', 
    'Procurement:view', 'Human Resources:view', 'EUDR Documentation:view',
    'Quality Control', 'Quality Control:create', 'Quality Control:edit',
    'Finance:create', 'Finance:edit', 'Finance:approve',
    'Procurement:create', 'Procurement:edit',
    'Human Resources:create', 'Human Resources:edit',
    'Inventory:create', 'Inventory:edit',
    'Sales Marketing:create', 'Sales Marketing:edit',
    'Reports:create', 'Milling:create', 'Milling:edit', 'Milling',
    'IT Management:create', 'IT Management:edit', 'IT Management:manage',
    'User Management:view', 'User Management:create', 'User Management:edit', 'User Management:manage'
  ],
  updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';