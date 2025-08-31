-- Fix permissions for main admin account
UPDATE employees 
SET role = 'Administrator',
    permissions = ARRAY['*'],
    status = 'Active'
WHERE email = 'kelvifauza@gmail.com';

-- Ensure Denis has proper permissions
UPDATE employees 
SET permissions = ARRAY['Human Resources', 'Finance', 'Reports', 'Store Management'],
    role = 'Manager',
    status = 'Active'
WHERE email = 'bwambaledenis8@gmail.com';

-- Add missing admin user if not exists
INSERT INTO employees (name, email, role, permissions, position, department, status, salary)
VALUES ('Main Administrator', 'kelvifauza@gmail.com', 'Administrator', ARRAY['*'], 'System Administrator', 'Administration', 'Active', 0)
ON CONFLICT (email) DO UPDATE SET
    role = 'Administrator',
    permissions = ARRAY['*'],
    status = 'Active';