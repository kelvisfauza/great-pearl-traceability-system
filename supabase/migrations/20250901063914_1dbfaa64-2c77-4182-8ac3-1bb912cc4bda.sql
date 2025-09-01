-- Fix Kibaba's permissions permanently
UPDATE employees 
SET role = 'Manager', 
    permissions = ARRAY['Quality Control', 'Milling', 'Reports', 'Store Management', 'Inventory', 'General Access', 'User Management', 'Finance']
WHERE email = 'nicholusscottlangz@gmail.com';