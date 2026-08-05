-- =====================================================================
-- Consolidate self-service tamper guards into one authoritative
-- allow-list trigger per table. Allow-list (rather than deny-list)
-- means any column not explicitly permitted is locked, including
-- columns added in the future.
-- =====================================================================

-- ---------- Drop the overlapping / partial guards ----------
DROP TRIGGER IF EXISTS guard_absence_appeal_self_update_trg ON public.absence_appeals;
DROP TRIGGER IF EXISTS trg_absence_appeal_self_guard ON public.absence_appeals;
DROP TRIGGER IF EXISTS trg_guard_absence_appeals_self_update ON public.absence_appeals;

DROP TRIGGER IF EXISTS enforce_bonuses_self_claim_only_trg ON public.bonuses;
DROP TRIGGER IF EXISTS guard_bonus_self_claim_trg ON public.bonuses;
DROP TRIGGER IF EXISTS trg_bonuses_claim_guard ON public.bonuses;
DROP TRIGGER IF EXISTS trg_guard_bonus_self_claim ON public.bonuses;
DROP TRIGGER IF EXISTS trg_guard_bonuses_self_update ON public.bonuses;

DROP TRIGGER IF EXISTS enforce_vouchers_self_claim_only_trg ON public.christmas_vouchers;
DROP TRIGGER IF EXISTS guard_voucher_self_claim_trg ON public.christmas_vouchers;
DROP TRIGGER IF EXISTS trg_guard_christmas_vouchers_self_update ON public.christmas_vouchers;
DROP TRIGGER IF EXISTS trg_guard_voucher_self_claim ON public.christmas_vouchers;
DROP TRIGGER IF EXISTS trg_vouchers_claim_guard ON public.christmas_vouchers;

DROP TRIGGER IF EXISTS enforce_loans_self_update_guard_trg ON public.loans;
DROP TRIGGER IF EXISTS guard_loan_self_update_trg ON public.loans;
DROP TRIGGER IF EXISTS trg_guard_loans_self_update ON public.loans;
DROP TRIGGER IF EXISTS trg_loan_self_update_guard ON public.loans;

DROP TRIGGER IF EXISTS enforce_overtime_self_claim_only_trg ON public.overtime_awards;
DROP TRIGGER IF EXISTS guard_overtime_self_claim_trg ON public.overtime_awards;
DROP TRIGGER IF EXISTS trg_guard_overtime_awards_self_update ON public.overtime_awards;
DROP TRIGGER IF EXISTS trg_overtime_claim_guard ON public.overtime_awards;

-- ---------- Shared helper: server-side / automation bypass ----------
CREATE OR REPLACE FUNCTION public.sg_is_automation()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
      OR current_setting('role', true) = 'service_role';
$$;

-- ---------- absence_appeals ----------
CREATE OR REPLACE FUNCTION public.sg_guard_absence_appeal_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['appeal_reason','appeal_submitted_at','appeal_status','updated_at'];
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role = ANY (ARRAY['Super Admin','Administrator','HR'])
  ) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only HR/Admin may modify absence appeal details; you may only submit or withdraw your appeal.';
  END IF;

  IF NEW.appeal_status IS DISTINCT FROM OLD.appeal_status
     AND NEW.appeal_status NOT IN ('pending','submitted','withdrawn') THEN
    RAISE EXCEPTION 'Only HR/Admin may approve or reject an absence appeal.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_sg_guard_absence_appeal_self_update
BEFORE UPDATE ON public.absence_appeals
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_absence_appeal_self_update();

-- ---------- bonuses ----------
CREATE OR REPLACE FUNCTION public.sg_guard_bonus_self_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['status','claimed_at','updated_at'];
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND (e.role = ANY (ARRAY['Administrator','Super Admin'])
           OR e.department = 'Human Resources')
  ) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only Admin/HR may modify bonus details; you may only claim your bonus.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only set your bonus status to claimed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_sg_guard_bonus_self_claim
BEFORE UPDATE ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_bonus_self_claim();

-- ---------- christmas_vouchers ----------
CREATE OR REPLACE FUNCTION public.sg_guard_voucher_self_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['status','claimed_at','completed_at','completed_by'];
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role = ANY (ARRAY['Administrator','Super Admin'])
  ) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only admins may modify voucher details; you may only claim your voucher.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only set your voucher status to claimed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_sg_guard_voucher_self_claim
BEFORE UPDATE ON public.christmas_vouchers
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_voucher_self_claim();

-- ---------- overtime_awards ----------
CREATE OR REPLACE FUNCTION public.sg_guard_overtime_self_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['status','claimed_at','completed_at','completed_by'];
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin()
     OR public.user_has_permission('Human Resources')
     OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only HR/Finance/Admin may modify overtime award details; you may only claim your award.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only set your overtime award status to claimed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_sg_guard_overtime_self_claim
BEFORE UPDATE ON public.overtime_awards
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_overtime_self_claim();

-- ---------- loans ----------
CREATE OR REPLACE FUNCTION public.sg_guard_loan_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY[
    'guarantor_approved','guarantor_approved_at','guarantor_declined',
    'guarantor_approval_code','status','updated_at'
  ];
  v_email text := lower(coalesce(public.get_current_user_email(), ''));
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  -- Everything outside the guarantor-response allow-list is locked:
  -- amounts, balances, interest, admin_approved, counter offers, identities.
  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only Finance/Admin may change loan amounts, balances, interest or approval fields.';
  END IF;

  -- Borrowers/guarantors may only cancel or decline, never approve/disburse.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending','pending_admin') THEN
    RAISE EXCEPTION 'Only Finance/Admin may set loan status to %.', NEW.status;
  END IF;

  -- Only the named guarantor may record a guarantor response.
  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined
      OR NEW.guarantor_approved_at IS DISTINCT FROM OLD.guarantor_approved_at)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) <> v_email) THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_sg_guard_loan_self_update
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_loan_self_update();

-- ---------- Tighten the absence-appeal self-service RLS policy ----------
-- Static value bound so a self-service write can never carry an
-- approved/rejected verdict, in addition to the trigger above.
DROP POLICY IF EXISTS "Users can appeal own deductions" ON public.absence_appeals;
CREATE POLICY "Users can appeal own deductions"
ON public.absence_appeals
FOR UPDATE
TO authenticated
USING (
  employee_email = (
    SELECT e.email FROM public.employees e
    WHERE e.auth_user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  employee_email = (
    SELECT e.email FROM public.employees e
    WHERE e.auth_user_id = auth.uid() LIMIT 1
  )
  AND appeal_status = ANY (ARRAY['none','pending','submitted','withdrawn'])
);