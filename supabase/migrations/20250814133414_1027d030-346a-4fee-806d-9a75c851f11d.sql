-- Add some test employees if they don't exist
INSERT INTO public.employees (name, email, position, department, role, permissions, status, salary)
VALUES 
  ('Admin User', 'admin@greatpearlcoffee.com', 'System Administrator', 'Administration', 'Administrator', ARRAY['*'], 'Active', 1000000),
  ('HR Manager', 'hr@greatpearlcoffee.com', 'HR Manager', 'Human Resources', 'Manager', ARRAY['Human Resources', 'Reports', 'Finance'], 'Active', 800000),
  ('Denis Bwambaledde', 'bwambaledenis8@gmail.com', 'Finance Manager', 'Finance', 'Manager', ARRAY['Finance', 'Reports', 'Human Resources'], 'Active', 900000)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = now();