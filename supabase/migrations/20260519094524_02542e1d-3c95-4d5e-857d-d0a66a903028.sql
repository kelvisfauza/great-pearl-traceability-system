CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
  is_user_mgr boolean := false;
  is_hr boolean := false;
BEGIN
  -- Service role / no auth context = trusted backend path
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    is_admin := public.is_current_user_admin();
  EXCEPTION WHEN OTHERS THEN
    is_admin := false;
  END;

  BEGIN
    is_user_mgr := public.user_has_permission('User Management');
  EXCEPTION WHEN OTHERS THEN
    is_user_mgr := false;
  END;

  BEGIN
    is_hr := public.user_has_permission('Human Resources');
  EXCEPTION WHEN OTHERS THEN
    is_hr := false;
  END;

  -- Admins, User Management staff, and HR can change privileged fields
  IF is_admin OR is_user_mgr OR is_hr THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.salary IS DISTINCT FROM OLD.salary
     OR NEW.disabled IS DISTINCT FROM OLD.disabled
     OR NEW.wallet_frozen IS DISTINCT FROM OLD.wallet_frozen
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Not authorized to modify privileged fields on employees'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;