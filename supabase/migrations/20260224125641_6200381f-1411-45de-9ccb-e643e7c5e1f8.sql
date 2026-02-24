
CREATE OR REPLACE FUNCTION public.get_unified_user_id(input_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_auth_id text;
BEGIN
  -- First check hardcoded legacy mappings
  CASE input_email
    WHEN 'denis@farmflow.ug' THEN RETURN 'JSxZYOSxmde6Cqra4clQNc92mRS2';
    WHEN 'kibaba@farmflow.ug' THEN RETURN 'kibaba_nicholus_temp_id';
    WHEN 'tumwine@farmflow.ug' THEN RETURN 'alex_tumwine_temp_id';
    WHEN 'timothy@farmflow.ug' THEN RETURN 'hr_manager_temp_id';
    WHEN 'fauza@farmflow.ug' THEN RETURN 'kusa_fauza_temp_id';
    WHEN 'nicholusscottlangz@gmail.com' THEN RETURN '5fe8c99d-ee15-484d-8765-9bd4b37f961f';
    ELSE
      -- Look up auth_user_id from employees table
      SELECT e.auth_user_id::text INTO found_auth_id
      FROM employees e
      WHERE e.email = input_email
        AND e.auth_user_id IS NOT NULL
      LIMIT 1;
      
      IF found_auth_id IS NOT NULL THEN
        RETURN found_auth_id;
      END IF;
      
      -- Fallback to email
      RETURN input_email;
  END CASE;
END;
$$;
