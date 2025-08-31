-- Update the employee record to have the correct auth_user_id
UPDATE employees 
SET auth_user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f'
WHERE email = 'nicholusscottlangz@gmail.com';

-- Update the get_unified_user_id function to handle this user correctly
CREATE OR REPLACE FUNCTION public.get_unified_user_id(input_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct mapping for known users with their actual auth_user_id
  CASE input_email
    WHEN 'denis@farmflow.ug' THEN RETURN 'JSxZYOSxmde6Cqra4clQNc92mRS2';
    WHEN 'kibaba@farmflow.ug' THEN RETURN 'kibaba_nicholus_temp_id';
    WHEN 'tumwine@farmflow.ug' THEN RETURN 'alex_tumwine_temp_id';
    WHEN 'timothy@farmflow.ug' THEN RETURN 'hr_manager_temp_id';
    WHEN 'fauza@farmflow.ug' THEN RETURN 'kusa_fauza_temp_id';
    WHEN 'nicholusscottlangz@gmail.com' THEN RETURN '5fe8c99d-ee15-484d-8765-9bd4b37f961f';
    ELSE RETURN input_email; -- fallback to email for new users
  END CASE;
END;
$$;