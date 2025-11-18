-- Fix is_current_user_admin to include Administrator role
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
    AND role IN ('Super Admin', 'Administrator')  -- Now includes both roles
    AND status = 'Active'
  );
END;
$function$;