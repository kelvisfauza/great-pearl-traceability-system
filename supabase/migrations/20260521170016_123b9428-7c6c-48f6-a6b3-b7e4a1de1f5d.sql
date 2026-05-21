
-- 1. Lock registry
CREATE TABLE IF NOT EXISTS public.employee_role_locks (
  email text PRIMARY KEY,
  role text NOT NULL,
  department text,
  position text,
  permissions text[] NOT NULL DEFAULT '{}',
  reason text,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_role_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage role locks" ON public.employee_role_locks;
CREATE POLICY "Admins manage role locks"
  ON public.employee_role_locks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE lower(e.email) = lower(auth.email())
        AND e.role = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE lower(e.email) = lower(auth.email())
        AND e.role = 'Administrator'
    )
  );

-- 2. Update the privilege-escalation guard with bypass flag
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_priv boolean;
  bypass text;
BEGIN
  BEGIN
    bypass := current_setting('app.role_lock_apply', true);
  EXCEPTION WHEN OTHERS THEN
    bypass := NULL;
  END;
  IF bypass = 'on' THEN
    RETURN NEW;
  END IF;

  is_priv := COALESCE(public.is_current_user_admin(), false)
          OR COALESCE(public.is_current_user_administrator(), false)
          OR COALESCE(public.user_has_permission('Human Resources'), false)
          OR COALESCE(public.user_has_permission('Human Resources:edit'), false)
          OR COALESCE(public.user_has_permission('User Management:edit'), false)
          OR COALESCE(public.can_manage_users(), false);

  IF is_priv THEN
    RETURN NEW;
  END IF;

  IF NEW.role            IS DISTINCT FROM OLD.role            THEN RAISE EXCEPTION 'Not allowed to change role'; END IF;
  IF NEW.permissions     IS DISTINCT FROM OLD.permissions     THEN RAISE EXCEPTION 'Not allowed to change permissions'; END IF;
  IF NEW.status          IS DISTINCT FROM OLD.status          THEN RAISE EXCEPTION 'Not allowed to change status'; END IF;
  IF NEW.disabled        IS DISTINCT FROM OLD.disabled        THEN RAISE EXCEPTION 'Not allowed to change disabled flag'; END IF;
  IF NEW.salary          IS DISTINCT FROM OLD.salary          THEN RAISE EXCEPTION 'Not allowed to change salary'; END IF;
  IF NEW.department      IS DISTINCT FROM OLD.department      THEN RAISE EXCEPTION 'Not allowed to change department'; END IF;
  IF NEW.position        IS DISTINCT FROM OLD.position        THEN RAISE EXCEPTION 'Not allowed to change position'; END IF;
  IF NEW.employee_id     IS DISTINCT FROM OLD.employee_id     THEN RAISE EXCEPTION 'Not allowed to change employee id'; END IF;
  IF NEW.email           IS DISTINCT FROM OLD.email           THEN RAISE EXCEPTION 'Not allowed to change email'; END IF;
  IF NEW.auth_user_id    IS DISTINCT FROM OLD.auth_user_id    THEN RAISE EXCEPTION 'Not allowed to change auth_user_id'; END IF;

  RETURN NEW;
END;
$function$;

-- 3. BEFORE trigger on employees: override values from lock
CREATE OR REPLACE FUNCTION public.enforce_employee_role_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_row public.employee_role_locks%ROWTYPE;
BEGIN
  SELECT * INTO lock_row
  FROM public.employee_role_locks
  WHERE lower(email) = lower(NEW.email);

  IF FOUND THEN
    NEW.role := lock_row.role;
    IF lock_row.department IS NOT NULL THEN
      NEW.department := lock_row.department;
    END IF;
    IF lock_row.position IS NOT NULL THEN
      NEW.position := lock_row.position;
    END IF;
    NEW.permissions := lock_row.permissions;
    PERFORM set_config('app.role_lock_apply', 'on', true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_employee_role_lock ON public.employees;
CREATE TRIGGER trg_enforce_employee_role_lock
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_employee_role_lock();

-- 4. AFTER trigger on locks: reconcile employee row immediately
CREATE OR REPLACE FUNCTION public.apply_employee_role_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.role_lock_apply', 'on', true);
  UPDATE public.employees
     SET role = NEW.role,
         department = COALESCE(NEW.department, department),
         position = COALESCE(NEW.position, position),
         permissions = NEW.permissions,
         updated_at = now()
   WHERE lower(email) = lower(NEW.email);
  PERFORM set_config('app.role_lock_apply', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_employee_role_lock ON public.employee_role_locks;
CREATE TRIGGER trg_apply_employee_role_lock
  AFTER INSERT OR UPDATE ON public.employee_role_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_employee_role_lock();

-- 5. Seed Timothy
INSERT INTO public.employee_role_locks (email, role, department, position, permissions, reason, locked_by)
VALUES (
  'tatwanzire@greatpearlcoffee.com',
  'User',
  'Procurement & IT',
  'IT & Procurement Officer',
  ARRAY[
    'Procurement:view','Procurement:create','Procurement:edit',
    'IT Management:view','IT Management:manage',
    'Reports:view','Reports:download',
    'Store Management:view',
    'Inventory:view'
  ],
  'Reset from escalated Administrator back to original IT & Procurement Officer role',
  'system'
)
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    permissions = EXCLUDED.permissions,
    reason = EXCLUDED.reason,
    updated_at = now();
