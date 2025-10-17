-- Update Denis's role to Administrator
UPDATE employees 
SET role = 'Administrator',
    updated_at = now()
WHERE email = 'bwambaledenis8@gmail.com';