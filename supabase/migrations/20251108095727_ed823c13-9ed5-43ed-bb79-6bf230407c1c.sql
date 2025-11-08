-- Link the auth_user_id for tatwanzire@gmail.com
UPDATE employees 
SET auth_user_id = '07953708-68f8-4a59-a23e-d1d350e44716'
WHERE email = 'tatwanzire@gmail.com';

-- Verify the update
SELECT id, name, email, role, status, auth_user_id 
FROM employees 
WHERE email = 'tatwanzire@gmail.com';