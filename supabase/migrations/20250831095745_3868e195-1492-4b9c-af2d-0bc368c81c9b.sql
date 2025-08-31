-- Fix Kibaba's permissions to have consistent format
UPDATE employees 
SET permissions = ARRAY['Quality Control', 'Milling', 'Reports', 'Store Management']
WHERE email = 'nicholusscottlangz@gmail.com';

-- Remove the duplicate Kibaba record with old permission format
DELETE FROM employees 
WHERE email = 'kibaba@farmflow.ug' AND name = 'Kibaba Nicholus';