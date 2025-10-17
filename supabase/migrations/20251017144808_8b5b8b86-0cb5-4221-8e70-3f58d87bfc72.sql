-- Add Supervisor role to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Supervisor';

-- Create helper functions for each role level
CREATE OR REPLACE FUNCTION public.is_user_role()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role = 'User'
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Supervisor', 'Manager', 'Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Manager', 'Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.employees 
  WHERE auth_user_id = auth.uid() 
  AND status = 'Active';
  
  RETURN COALESCE(user_role, 'User');
END;
$$;

-- Create a function to check if user can perform specific actions
CREATE OR REPLACE FUNCTION public.can_perform_action(action_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role();
  
  -- Super Admin can do everything
  IF user_role = 'Super Admin' THEN
    RETURN true;
  END IF;
  
  -- Manager and Administrator permissions
  IF user_role IN ('Manager', 'Administrator') THEN
    RETURN action_type IN ('view', 'create', 'edit', 'approve', 'print', 'export', 'delete');
  END IF;
  
  -- Supervisor permissions
  IF user_role = 'Supervisor' THEN
    RETURN action_type IN ('view', 'create', 'edit', 'export');
  END IF;
  
  -- User permissions (basic)
  IF user_role = 'User' THEN
    RETURN action_type IN ('view', 'create');
  END IF;
  
  RETURN false;
END;
$$;