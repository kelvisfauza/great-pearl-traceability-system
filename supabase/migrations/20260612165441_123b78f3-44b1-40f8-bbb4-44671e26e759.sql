CREATE OR REPLACE FUNCTION public.is_loan_appeal_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text IN ('Administrator','Super Admin')
  ) OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = _uid
      AND role IN ('Administrator','Super Admin')
      AND COALESCE(status, 'Active') = 'Active'
  );
$function$;