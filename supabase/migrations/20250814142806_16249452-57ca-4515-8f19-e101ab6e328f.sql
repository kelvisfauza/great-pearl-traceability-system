-- Fix Kibaba's permissions to include proper case-sensitive permissions
UPDATE employees 
SET permissions = array['Quality Control', 'Milling', 'Reports']
WHERE email = 'nicholusscottlangz@gmail.com';

-- Also ensure any other users with milling permissions have the correct case
UPDATE employees 
SET permissions = array_replace(permissions, 'milling', 'Milling')
WHERE 'milling' = ANY(permissions);