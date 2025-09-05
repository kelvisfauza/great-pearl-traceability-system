-- Create auth account for Morjalia by updating her auth_user_id
-- This is a placeholder - the actual auth user needs to be created in Supabase Auth
UPDATE public.employees 
SET auth_user_id = '12345678-1234-5678-9012-123456789012'::uuid
WHERE email = 'morjaliajadens@gmail.com';

-- Create function to help with Morjalia's auth setup
CREATE OR REPLACE FUNCTION public.setup_morjalia_auth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  morjalia_employee RECORD;
  temp_password TEXT := 'MorjaliaFarmFlow2025!';
BEGIN
  -- Get Morjalia's employee record
  SELECT * INTO morjalia_employee 
  FROM public.employees 
  WHERE email = 'morjaliajadens@gmail.com';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Morjalia employee record not found'
    );
  END IF;
  
  -- Return success with instructions for manual auth creation
  RETURN json_build_object(
    'success', true,
    'message', 'Morjalia account ready for auth creation',
    'email', morjalia_employee.email,
    'name', morjalia_employee.name,
    'phone', morjalia_employee.phone,
    'employee_id', morjalia_employee.id,
    'temp_password', temp_password,
    'instructions', 'Create auth user manually in Supabase dashboard with this email and password, then update employee record with auth_user_id'
  );
END;
$$;