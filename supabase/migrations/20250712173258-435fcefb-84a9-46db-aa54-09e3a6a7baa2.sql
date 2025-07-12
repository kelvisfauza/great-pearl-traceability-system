
-- Enable the auth schema extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table to link auth users with employees
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(employee_id)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to get current user's employee data
CREATE OR REPLACE FUNCTION public.get_current_employee()
RETURNS TABLE(
  employee_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  role TEXT,
  permissions TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    e.id,
    e.name,
    e.email,
    e.phone,
    e.position,
    e.department,
    e.role,
    e.permissions
  FROM public.employees e
  JOIN public.user_profiles up ON e.id = up.employee_id
  WHERE up.user_id = auth.uid();
$$;

-- Create a function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees e
    JOIN public.user_profiles up ON e.id = up.employee_id
    WHERE up.user_id = auth.uid() 
    AND permission_name = ANY(e.permissions)
  );
$$;

-- Create a function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees e
    JOIN public.user_profiles up ON e.id = up.employee_id
    WHERE up.user_id = auth.uid() 
    AND e.role = role_name
  );
$$;

-- Update employees table RLS policies to be more restrictive
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can update employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can delete employees" ON public.employees;

-- New restrictive policies for employees table
CREATE POLICY "Users can view employees based on permissions" ON public.employees
  FOR SELECT USING (
    public.user_has_permission('Human Resources') OR 
    public.user_has_role('Administrator') OR
    public.user_has_role('Manager')
  );

CREATE POLICY "HR and Admins can insert employees" ON public.employees
  FOR INSERT WITH CHECK (
    public.user_has_permission('Human Resources') OR 
    public.user_has_role('Administrator')
  );

CREATE POLICY "HR and Admins can update employees" ON public.employees
  FOR UPDATE USING (
    public.user_has_permission('Human Resources') OR 
    public.user_has_role('Administrator')
  );

CREATE POLICY "Only Admins can delete employees" ON public.employees
  FOR DELETE USING (public.user_has_role('Administrator'));

-- Update salary_payments table RLS policies
DROP POLICY IF EXISTS "Anyone can view salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can insert salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can update salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can delete salary payments" ON public.salary_payments;

-- New restrictive policies for salary_payments table
CREATE POLICY "Finance and HR can view salary payments" ON public.salary_payments
  FOR SELECT USING (
    public.user_has_permission('Finance') OR 
    public.user_has_permission('Human Resources') OR
    public.user_has_role('Administrator')
  );

CREATE POLICY "Finance and HR can insert salary payments" ON public.salary_payments
  FOR INSERT WITH CHECK (
    public.user_has_permission('Finance') OR 
    public.user_has_permission('Human Resources') OR
    public.user_has_role('Administrator')
  );

CREATE POLICY "Finance and HR can update salary payments" ON public.salary_payments
  FOR UPDATE USING (
    public.user_has_permission('Finance') OR 
    public.user_has_permission('Human Resources') OR
    public.user_has_role('Administrator')
  );

CREATE POLICY "Only Admins can delete salary payments" ON public.salary_payments
  FOR DELETE USING (public.user_has_role('Administrator'));

-- Function to automatically create user profile when employee is created with email matching auth user
CREATE OR REPLACE FUNCTION public.handle_employee_user_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to link employee to existing auth user with same email
  INSERT INTO public.user_profiles (user_id, employee_id)
  SELECT au.id, NEW.id
  FROM auth.users au
  WHERE au.email = NEW.email
  ON CONFLICT (user_id) DO NOTHING
  ON CONFLICT (employee_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically link employees to users
CREATE TRIGGER on_employee_created
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_user_link();
