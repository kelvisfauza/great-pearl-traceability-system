CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Internal role-lock sync (already validated) and privileged/service contexts bypass
  IF coalesce(current_setting('app.role_lock_apply', true), 'off') = 'on'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_administrator() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only administrators can change the role column on employees'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    RAISE EXCEPTION 'Only administrators can change the permissions column on employees'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.disabled IS DISTINCT FROM OLD.disabled THEN
    RAISE EXCEPTION 'Only administrators can change the disabled column on employees'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.employee_role_locks
SET permissions = (
  SELECT array_agg(DISTINCT p ORDER BY p)
  FROM unnest(permissions || ARRAY[
    'Sales Marketing:view',
    'Sales Marketing:create',
    'Sales Marketing:edit',
    'Sales Marketing:export',
    'Sales Marketing:print'
  ]) AS p
),
updated_at = now()
WHERE lower(email) = lower('tatwanzire@greatpearlcoffee.com');