-- Update Timothy's permissions: Full IT, view-only for other departments, no HR
UPDATE public.employees 
SET 
  permissions = ARRAY[
    -- Full IT Management
    'IT Management:view',
    'IT Management:create',
    'IT Management:edit',
    'IT Management:manage',
    -- View-only for other departments
    'Sales:view',
    'Marketing:view',
    'Data Analysis:view',
    'Field Operations:view',
    'EUDR Documentation:view',
    'Finance:view',
    'Quality Control:view',
    'Store Management:view',
    'Inventory:view'
    -- NO Human Resources permissions
  ],
  updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';