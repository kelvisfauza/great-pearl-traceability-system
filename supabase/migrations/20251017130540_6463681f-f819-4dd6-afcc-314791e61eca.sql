-- Revoke admin powers from Denis by changing role back to User
UPDATE employees 
SET role = 'User',
    updated_at = now()
WHERE email = 'bwambaledenis8@gmail.com';