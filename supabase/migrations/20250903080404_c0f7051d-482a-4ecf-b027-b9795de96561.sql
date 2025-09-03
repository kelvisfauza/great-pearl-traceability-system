-- Update Timothy's department to IT Department and modify his permissions
UPDATE public.employees 
SET department = 'IT Department', 
    permissions = ARRAY['Quality Control', 'Inventory', 'Store Management', 'Reports']
WHERE email = 'tatwanzire@gmail.com';