-- Update Timothy to view-only permissions across all modules
UPDATE public.employees 
SET 
  role = 'User',
  permissions = ARRAY[
    'Finance:view', 'Reports:view', 'Data Analysis:view', 'Field Operations:view', 
    'Sales Marketing:view', 'Logistics:view', 'IT Management:view', 'Milling:view', 
    'Store Management:view', 'Processing:view', 'Inventory:view', 'Quality Control:view', 
    'Procurement:view', 'Human Resources:view', 'EUDR Documentation:view',
    'User Management:view', 'Administration:view', 'Operations:view'
  ],
  updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';