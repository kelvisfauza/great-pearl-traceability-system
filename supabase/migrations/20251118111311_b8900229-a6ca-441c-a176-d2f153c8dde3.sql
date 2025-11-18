-- Fix 1: Create separate user_roles table using EXISTING app_role enum values

-- Create user_roles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      role app_role NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      created_by UUID REFERENCES auth.users(id),
      UNIQUE (user_id, role)
    );

    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create SECURITY DEFINER function to check roles (avoids RLS recursion)
-- Using EXISTING enum values: 'Super Admin', 'Administrator', 'Manager', 'Supervisor', 'User'
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create helper function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'Super Admin' THEN 5
      WHEN 'Manager' THEN 4
      WHEN 'Administrator' THEN 3
      WHEN 'Supervisor' THEN 2
      ELSE 1
    END DESC
  LIMIT 1
$$;

-- Drop and recreate RLS policies for user_roles table
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
CREATE POLICY "Super admins can view all roles" ON user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'Super Admin'));

DROP POLICY IF EXISTS "Super admins can assign roles" ON user_roles;
CREATE POLICY "Super admins can assign roles" ON user_roles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'Super Admin'));

DROP POLICY IF EXISTS "Super admins can update roles" ON user_roles;
CREATE POLICY "Super admins can update roles" ON user_roles
FOR UPDATE USING (public.has_role(auth.uid(), 'Super Admin'));

DROP POLICY IF EXISTS "Super admins can delete roles" ON user_roles;
CREATE POLICY "Super admins can delete roles" ON user_roles
FOR DELETE USING (public.has_role(auth.uid(), 'Super Admin'));

-- Migrate existing roles from employees table to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  auth_user_id,
  employees.role::app_role,
  created_at
FROM public.employees
WHERE auth_user_id IS NOT NULL
  AND employees.role IN ('Super Admin', 'Manager', 'Administrator', 'Supervisor', 'User')
ON CONFLICT (user_id, role) DO NOTHING;