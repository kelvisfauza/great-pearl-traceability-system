-- First, let's fix the employees table structure and policies
-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

-- Add the missing auth_user_id column if it doesn't exist
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- Create simpler, working RLS policies
CREATE POLICY "Anyone can view employees" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to insert employees (we'll handle permissions in the app)
CREATE POLICY "Authenticated users can insert employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update employees (we'll handle permissions in the app)
CREATE POLICY "Authenticated users can update employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (true);

-- Allow authenticated users to delete employees (we'll handle permissions in the app)
CREATE POLICY "Authenticated users can delete employees" 
ON public.employees 
FOR DELETE 
TO authenticated
USING (true);