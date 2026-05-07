
-- Ensure pgcrypto is available for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Lock down public SELECT policies on internal tables
-- ============================================================

-- announcements
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Authenticated can view announcements"
  ON public.announcements FOR SELECT TO authenticated USING (true);

-- coffee_bookings
DROP POLICY IF EXISTS "Allow read access to coffee_bookings" ON public.coffee_bookings;
CREATE POLICY "Authenticated can read coffee_bookings"
  ON public.coffee_bookings FOR SELECT TO authenticated USING (true);

-- contract_files
DROP POLICY IF EXISTS "Users can view contract files" ON public.contract_files;
CREATE POLICY "Authenticated can view contract files"
  ON public.contract_files FOR SELECT TO authenticated USING (true);

-- daily_reports
DROP POLICY IF EXISTS "Anyone can view daily_reports" ON public.daily_reports;
CREATE POLICY "Authenticated can view daily_reports"
  ON public.daily_reports FOR SELECT TO authenticated USING (true);

-- weekly_reports
DROP POLICY IF EXISTS "Anyone can view weekly_reports" ON public.weekly_reports;
CREATE POLICY "Authenticated can view weekly_reports"
  ON public.weekly_reports FOR SELECT TO authenticated USING (true);

-- edit_requests
DROP POLICY IF EXISTS "Anyone can view edit requests" ON public.edit_requests;
CREATE POLICY "Authenticated can view edit requests"
  ON public.edit_requests FOR SELECT TO authenticated USING (true);

-- eudr_dispatch_reports
DROP POLICY IF EXISTS "Anyone can view dispatch reports" ON public.eudr_dispatch_reports;
CREATE POLICY "Authenticated can view dispatch reports"
  ON public.eudr_dispatch_reports FOR SELECT TO authenticated USING (true);

-- facilitation_requests
DROP POLICY IF EXISTS "Anyone can view facilitation_requests" ON public.facilitation_requests;
CREATE POLICY "Authenticated can view facilitation_requests"
  ON public.facilitation_requests FOR SELECT TO authenticated USING (true);

-- field_agents
DROP POLICY IF EXISTS "Anyone can view field_agents" ON public.field_agents;
CREATE POLICY "Authenticated can view field_agents"
  ON public.field_agents FOR SELECT TO authenticated USING (true);

-- field_attendance_logs
DROP POLICY IF EXISTS "Anyone can view field_attendance_logs" ON public.field_attendance_logs;
CREATE POLICY "Authenticated can view field_attendance_logs"
  ON public.field_attendance_logs FOR SELECT TO authenticated USING (true);

-- modification_requests
DROP POLICY IF EXISTS "Users can view modification requests" ON public.modification_requests;
CREATE POLICY "Authenticated can view modification requests"
  ON public.modification_requests FOR SELECT TO authenticated USING (true);

-- workflow_steps
DROP POLICY IF EXISTS "Users can view workflow steps" ON public.workflow_steps;
CREATE POLICY "Authenticated can view workflow steps"
  ON public.workflow_steps FOR SELECT TO authenticated USING (true);

-- store_records
DROP POLICY IF EXISTS "Anyone can view store records" ON public.store_records;
CREATE POLICY "Authenticated can view store records"
  ON public.store_records FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 2. system_maintenance: hide recovery credentials from non-admins
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can read maintenance status" ON public.system_maintenance;

-- Only admins can read the full row (with recovery_key/pin)
CREATE POLICY "Admins can read maintenance row"
  ON public.system_maintenance FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Hash maintenance recovery code/pin on write
CREATE OR REPLACE FUNCTION public.hash_maintenance_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recovery_key IS NOT NULL AND NEW.recovery_key !~ '^\$2[aby]\$' THEN
    NEW.recovery_key := crypt(NEW.recovery_key, gen_salt('bf'));
  END IF;
  IF NEW.recovery_pin IS NOT NULL AND NEW.recovery_pin !~ '^\$2[aby]\$' THEN
    NEW.recovery_pin := crypt(NEW.recovery_pin, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_maintenance_credentials ON public.system_maintenance;
CREATE TRIGGER trg_hash_maintenance_credentials
  BEFORE INSERT OR UPDATE OF recovery_key, recovery_pin ON public.system_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.hash_maintenance_credentials();

-- Secure verification + deactivation RPC
CREATE OR REPLACE FUNCTION public.verify_and_deactivate_maintenance(_code text, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SELECT id, recovery_key, recovery_pin
    INTO rec
    FROM public.system_maintenance
    LIMIT 1;

  IF rec IS NULL OR rec.recovery_key IS NULL OR rec.recovery_pin IS NULL THEN
    RETURN false;
  END IF;

  IF rec.recovery_key <> crypt(_code, rec.recovery_key)
     OR rec.recovery_pin <> crypt(_pin, rec.recovery_pin) THEN
    RETURN false;
  END IF;

  UPDATE public.system_maintenance
     SET is_active = false,
         reason = NULL,
         activated_by = NULL,
         activated_at = NULL,
         recovery_key = NULL,
         recovery_pin = NULL,
         expected_back_online = NULL
   WHERE id = rec.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_and_deactivate_maintenance(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_and_deactivate_maintenance(text, text) TO anon, authenticated;

-- ============================================================
-- 3. admin_initiated_withdrawals: hash PIN + secure verify RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.hash_admin_withdrawal_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pin_code IS NOT NULL AND NEW.pin_code !~ '^\$2[aby]\$' THEN
    NEW.pin_code := crypt(NEW.pin_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_admin_withdrawal_pin ON public.admin_initiated_withdrawals;
CREATE TRIGGER trg_hash_admin_withdrawal_pin
  BEFORE INSERT OR UPDATE OF pin_code ON public.admin_initiated_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.hash_admin_withdrawal_pin();

-- Verify PIN without exposing the hash
CREATE OR REPLACE FUNCTION public.verify_admin_withdrawal_pin(_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SELECT pin_code, pin_expires_at, status, employee_email
    INTO rec
    FROM public.admin_initiated_withdrawals
    WHERE id = _id;

  IF rec IS NULL OR rec.status <> 'pending_pin' OR rec.pin_expires_at < now() THEN
    RETURN false;
  END IF;

  -- Only the target employee can verify their own PIN
  IF rec.employee_email <> (SELECT email FROM auth.users WHERE id = auth.uid())::text THEN
    RETURN false;
  END IF;

  RETURN rec.pin_code = crypt(_pin, rec.pin_code);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) TO authenticated;
