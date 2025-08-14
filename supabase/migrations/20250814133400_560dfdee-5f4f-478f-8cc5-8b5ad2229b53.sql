-- Drop ALL existing policies on employees table
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view all profiles" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

-- Add the auth_user_id column if it doesn't exist
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- Create simple, working RLS policies that allow role management
CREATE POLICY "employees_select_policy" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "employees_insert_policy" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "employees_update_policy" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "employees_delete_policy" 
ON public.employees 
FOR DELETE 
TO authenticated
USING (true);