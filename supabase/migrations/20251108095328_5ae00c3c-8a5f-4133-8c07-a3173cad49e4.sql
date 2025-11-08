-- Grant Finance Manager role to tatwanzire@gmail.com
UPDATE employees 
SET role = 'Finance Manager'
WHERE email = 'tatwanzire@gmail.com' AND status = 'Active';

-- Verify the update
SELECT id, name, email, role, status 
FROM employees 
WHERE email = 'tatwanzire@gmail.com';