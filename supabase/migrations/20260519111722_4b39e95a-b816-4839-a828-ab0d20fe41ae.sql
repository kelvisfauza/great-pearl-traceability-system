-- 1. Ensure pg_net is available for async edge function calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Audit table (append-only)
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  target_user_id uuid,
  old_role text,
  new_role text,
  actor_user_id uuid,
  actor_role text,
  was_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  raw_old jsonb,
  raw_new jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- 3. Super-admin allow-list (hardcoded UUIDs of trusted operators)
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND _uid = ANY (ARRAY[
    '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec'::uuid  -- Fauzakusa
  ]);
$$;

-- 4. RLS policies on audit table (only super-admins can read; nobody updates/deletes)
DROP POLICY IF EXISTS "super_admin_read_audit" ON public.role_change_audit;
CREATE POLICY "super_admin_read_audit"
  ON public.role_change_audit FOR SELECT
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "no_update_audit" ON public.role_change_audit;
CREATE POLICY "no_update_audit"
  ON public.role_change_audit FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "no_delete_audit" ON public.role_change_audit;
CREATE POLICY "no_delete_audit"
  ON public.role_change_audit FOR DELETE
  USING (false);

-- 5. Guard trigger (BEFORE) — blocks self-promotion and unauthorized admin grants
CREATE OR REPLACE FUNCTION public.guard_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  target uuid;
  new_r text;
  old_r text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.user_id;
    old_r := OLD.role;
  ELSE
    target := NEW.user_id;
    new_r := NEW.role;
    IF TG_OP = 'UPDATE' THEN old_r := OLD.role; END IF;
  END IF;

  -- Rule 1: no self-mutation of own role row
  IF actor IS NOT NULL AND actor = target THEN
    INSERT INTO public.role_change_audit (operation, target_user_id, old_role, new_role, actor_user_id, was_blocked, block_reason, raw_old, raw_new)
    VALUES (TG_OP, target, old_r, new_r, actor, true, 'self-mutation forbidden', to_jsonb(OLD), to_jsonb(NEW));
    RAISE EXCEPTION 'You cannot modify your own role assignment (self-mutation blocked).';
  END IF;

  -- Rule 2: granting/changing-to admin requires super-admin
  IF TG_OP IN ('INSERT','UPDATE')
     AND lower(coalesce(new_r,'')) IN ('admin','administrator','superadmin','super_admin')
     AND NOT public.is_super_admin(actor) THEN
    INSERT INTO public.role_change_audit (operation, target_user_id, old_role, new_role, actor_user_id, was_blocked, block_reason, raw_old, raw_new)
    VALUES (TG_OP, target, old_r, new_r, actor, true, 'only super-admin can grant admin role', to_jsonb(OLD), to_jsonb(NEW));
    RAISE EXCEPTION 'Only the super-admin can grant the admin role.';
  END IF;

  -- Rule 3: removing an admin requires super-admin
  IF TG_OP IN ('UPDATE','DELETE')
     AND lower(coalesce(old_r,'')) IN ('admin','administrator','superadmin','super_admin')
     AND NOT public.is_super_admin(actor) THEN
    INSERT INTO public.role_change_audit (operation, target_user_id, old_role, new_role, actor_user_id, was_blocked, block_reason, raw_old, raw_new)
    VALUES (TG_OP, target, old_r, new_r, actor, true, 'only super-admin can remove admin role', to_jsonb(OLD), to_jsonb(NEW));
    RAISE EXCEPTION 'Only the super-admin can remove an admin role.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_roles ON public.user_roles;
CREATE TRIGGER trg_guard_user_roles
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles();

-- 6. Audit + email-alert trigger (AFTER) — runs on any successful change
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  actor uuid := auth.uid();
  target uuid;
  new_r text;
  old_r text;
  proj_url text := 'https://pudfybkyfedeggmokhco.supabase.co';
  svc_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.user_id; old_r := OLD.role;
  ELSE
    target := NEW.user_id; new_r := NEW.role;
    IF TG_OP = 'UPDATE' THEN old_r := OLD.role; END IF;
  END IF;

  INSERT INTO public.role_change_audit (operation, target_user_id, old_role, new_role, actor_user_id, was_blocked, raw_old, raw_new)
  VALUES (TG_OP, target, old_r, new_r, actor, false, to_jsonb(OLD), to_jsonb(NEW));

  -- Fire-and-forget email alert via edge function
  BEGIN
    SELECT decrypted_secret INTO svc_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    svc_key := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url := proj_url || '/functions/v1/notify-role-change',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || COALESCE(svc_key,'')
      ),
      body := jsonb_build_object(
        'operation', TG_OP,
        'target_user_id', target,
        'old_role', old_r,
        'new_role', new_r,
        'actor_user_id', actor,
        'occurred_at', now()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block the change because of the alert
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();