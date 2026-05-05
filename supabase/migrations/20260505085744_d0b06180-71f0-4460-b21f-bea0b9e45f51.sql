
-- ============================================================
-- 1) Tighten permissive RLS policies in public schema
-- ============================================================
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  cmd_clause TEXT;
  roles_clause TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    -- Skip storage/auth - we're filtered to public anyway
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    -- Determine new expressions: replace bare 'true' with auth check, keep other quals
    IF r.qual IS NULL THEN
      new_qual := NULL;
    ELSIF r.qual = 'true' THEN
      new_qual := 'auth.uid() IS NOT NULL';
    ELSE
      new_qual := r.qual;
    END IF;

    IF r.with_check IS NULL THEN
      new_check := NULL;
    ELSIF r.with_check = 'true' THEN
      new_check := 'auth.uid() IS NOT NULL';
    ELSE
      new_check := r.with_check;
    END IF;

    cmd_clause := CASE r.cmd
      WHEN 'ALL' THEN 'ALL'
      ELSE r.cmd
    END;

    roles_clause := COALESCE(
      (SELECT string_agg(quote_ident(unnest_role), ', ')
       FROM unnest(r.roles) AS unnest_role
       WHERE unnest_role <> 'public'),
      'authenticated'
    );
    IF roles_clause IS NULL OR roles_clause = '' THEN
      roles_clause := 'authenticated';
    END IF;

    -- Build CREATE POLICY
    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        cmd_clause, roles_clause, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        cmd_clause, roles_clause, new_qual
      );
    ELSIF new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        cmd_clause, roles_clause, new_check
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2) Realtime channel authorization
-- ============================================================
-- Helper: privileged role check
CREATE OR REPLACE FUNCTION public.is_privileged_realtime_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = _user_id
      AND role IN ('Super Admin','Administrator','Admin','IT','HR','Finance','Finance Manager','HR Manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_privileged_realtime_subscriber(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_privileged_realtime_subscriber(uuid) TO authenticated;

-- Enable RLS on realtime.messages and add scoping policies
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_authenticated_safe_topics" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_privileged_all_topics" ON realtime.messages;

-- Privileged staff can subscribe to anything
CREATE POLICY "realtime_privileged_all_topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.is_privileged_realtime_subscriber(auth.uid()));

-- Other signed-in users cannot subscribe to sensitive topics
CREATE POLICY "realtime_authenticated_safe_topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND realtime.topic() !~* '^(employees|admin_initiated_withdrawals|mobile_money_transactions|system_errors|salary|withdrawal|finance|payroll|verification|otp|pin)'
  );

-- ============================================================
-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions from anon
-- (keep them callable by authenticated where needed)
-- ============================================================
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public',
                     f.nspname, f.proname, f.args);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
