-- Create app_role enum with proper hierarchy
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('Super Admin', 'Administrator', 'Manager', 'User');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update employees table to use the role enum (keep existing text for backwards compatibility)
-- We'll use the existing role column but enforce valid values

-- Update the is_current_user_admin function to only check for Super Admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Super Admin'
    AND status = 'Active'
  );
END;
$function$;

-- Create new function to check if user is an administrator (approval rights but limited access)
CREATE OR REPLACE FUNCTION public.is_current_user_administrator()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$function$;

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND status = 'Active'
    AND (
      role = 'Super Admin' -- Super Admin has all permissions
      OR permission_name = ANY(permissions) -- Or user has specific permission
    )
  );
END;
$function$;

-- Update your role to Super Admin (you'll be the system administrator)
UPDATE employees 
SET role = 'Super Admin',
    updated_at = now()
WHERE email = 'nicholusscottlangz@gmail.com';

-- Ensure Denis stays as regular User
UPDATE employees 
SET role = 'User',
    updated_at = now()
WHERE email = 'bwambaledenis8@gmail.com';