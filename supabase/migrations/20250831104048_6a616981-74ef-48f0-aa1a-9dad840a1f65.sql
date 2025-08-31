-- Update Kibaba's permissions to include all the permissions he needs
UPDATE public.employees 
SET permissions = ARRAY[
  'Quality Control',
  'Milling', 
  'Reports',
  'Store Management',
  'Inventory',
  'General Access'
]
WHERE email = 'nicholusscottlangz@gmail.com';

-- Update main admin to have permission management access
UPDATE public.employees 
SET permissions = ARRAY['*', 'Permission Management']
WHERE email = 'kelvifauza@gmail.com';

-- Add a sample permission assignment for any other active employees that don't have proper permissions
UPDATE public.employees 
SET permissions = ARRAY['General Access', 'Reports']
WHERE array_length(permissions, 1) IS NULL OR permissions = '{}' OR permissions IS NULL
AND status = 'Active';