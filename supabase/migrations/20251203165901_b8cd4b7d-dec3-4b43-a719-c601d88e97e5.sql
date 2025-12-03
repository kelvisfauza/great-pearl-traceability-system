-- Add Dashboard view permission for Timothy
UPDATE public.employees 
SET 
  permissions = ARRAY[
    -- Dashboard access
    'Dashboard:view',
    -- Full IT Management
    'IT Management:view',
    'IT Management:create',
    'IT Management:edit',
    'IT Management:manage',
    -- View-only for other departments
    'Sales:view',
    'Marketing:view',
    'Field Operations:view',
    'EUDR Documentation:view',
    'Finance:view',
    'Quality Control:view',
    'Store Management:view',
    'Inventory:view'
  ],
  updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';