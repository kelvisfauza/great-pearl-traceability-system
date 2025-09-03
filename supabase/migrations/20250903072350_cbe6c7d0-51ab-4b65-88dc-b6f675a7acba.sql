-- Create Timothy's auth user account and link it to his employee record
-- This will be handled by calling the create-user edge function from the application

-- For now, let's prepare a temporary password reset for Timothy
-- First, let's check if we have a create-user edge function that can handle this

-- We'll create a simple function to generate a secure temporary password for Timothy
CREATE OR REPLACE FUNCTION public.create_timothy_auth_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  timothy_employee RECORD;
  temp_password TEXT := 'TimothyFarmFlow2025!';
BEGIN
  -- Get Timothy's employee record
  SELECT * INTO timothy_employee 
  FROM public.employees 
  WHERE email = 'tatwanzire@gmail.com';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Timothy employee record not found'
    );
  END IF;
  
  -- Return success with instructions for manual auth creation
  RETURN json_build_object(
    'success', true,
    'message', 'Timothy account ready for auth creation',
    'email', timothy_employee.email,
    'name', timothy_employee.name,
    'phone', timothy_employee.phone,
    'employee_id', timothy_employee.id,
    'temp_password', temp_password,
    'instructions', 'Create auth user manually in Supabase dashboard with this email and password, then update employee record with auth_user_id'
  );
END;
$$;