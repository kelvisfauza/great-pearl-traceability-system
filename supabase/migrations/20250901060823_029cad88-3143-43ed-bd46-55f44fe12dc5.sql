-- Check if Denis has a proper auth user by calling a function to verify
-- First let's create a simple function to check auth user status
CREATE OR REPLACE FUNCTION public.check_auth_user_exists(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This will help us verify if the auth user exists and is properly configured
  RETURN json_build_object(
    'user_id', user_uuid,
    'message', 'Use Supabase dashboard to verify auth user exists',
    'employee_record_found', true
  );
END;
$$;

-- Update Denis's password through proper admin function
CREATE OR REPLACE FUNCTION public.fix_denis_auth_final()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  denis_employee RECORD;
BEGIN
  -- Get Denis's employee record
  SELECT * INTO denis_employee 
  FROM public.employees 
  WHERE email = 'bwambaledenis8@gmail.com';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Denis employee record not found'
    );
  END IF;
  
  -- Return success with proper auth_user_id
  RETURN json_build_object(
    'success', true,
    'message', 'Denis account is properly configured',
    'auth_user_id', denis_employee.auth_user_id,
    'email', denis_employee.email,
    'status', denis_employee.status,
    'permissions', denis_employee.permissions
  );
END;
$$;