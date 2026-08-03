CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND (e.role = ANY (ARRAY['Super Admin','Administrator','Manager','HR'])
           OR e.department = 'Human Resources'
           OR 'Human Resources' = ANY (COALESCE(e.permissions, ARRAY[]::text[])))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_hr_or_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND (e.role = ANY (ARRAY['Super Admin','Administrator','Manager','HR','Finance','Finance Manager'])
           OR e.department = 'Human Resources'
           OR COALESCE(e.permissions, ARRAY[]::text[]) && ARRAY['Human Resources','Finance','Finance Management','Finance Approval','Administration'])
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quality_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND (e.role = ANY (ARRAY['Super Admin','Administrator','Manager'])
           OR e.department = 'Quality Control'
           OR COALESCE(e.permissions, ARRAY[]::text[]) && ARRAY['Quality Control','Quality','Quality Management','Administration'])
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_absence_appeal_self_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed text[] := ARRAY['appeal_reason','appeal_submitted_at','updated_at','appeal_status'];
BEGIN
  IF public.is_admin_or_hr() THEN RETURN NEW; END IF;
  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only HR/Admin can modify appeal review fields';
  END IF;
  IF NEW.appeal_status IS DISTINCT FROM OLD.appeal_status
     AND NEW.appeal_status NOT IN ('pending','submitted') THEN
    RAISE EXCEPTION 'Only HR/Admin can approve or reject appeals';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_absence_appeal_self_guard ON public.absence_appeals;
CREATE TRIGGER trg_absence_appeal_self_guard
BEFORE UPDATE ON public.absence_appeals
FOR EACH ROW EXECUTE FUNCTION public.enforce_absence_appeal_self_guard();

DROP POLICY IF EXISTS "Authenticated users can insert approval requests" ON public.approval_requests;
CREATE POLICY "Users insert own approval requests"
ON public.approval_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    lower(COALESCE(requestedby,'')) = lower(COALESCE((SELECT e.email FROM public.employees e WHERE e.auth_user_id = auth.uid() LIMIT 1),'~none~'))
    OR public.is_current_user_admin()
    OR public.user_has_permission('Finance')
  )
);

CREATE OR REPLACE FUNCTION public.enforce_claim_amount_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed text[] := ARRAY['status','claimed_at','updated_at','completed_at','completed_by'];
BEGIN
  IF public.is_admin_hr_or_finance() THEN RETURN NEW; END IF;
  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Claiming may only change status/claimed_at; amounts and other fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bonuses_claim_guard ON public.bonuses;
CREATE TRIGGER trg_bonuses_claim_guard BEFORE UPDATE ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.enforce_claim_amount_immutable();

DROP TRIGGER IF EXISTS trg_vouchers_claim_guard ON public.christmas_vouchers;
CREATE TRIGGER trg_vouchers_claim_guard BEFORE UPDATE ON public.christmas_vouchers
FOR EACH ROW EXECUTE FUNCTION public.enforce_claim_amount_immutable();

DROP TRIGGER IF EXISTS trg_overtime_claim_guard ON public.overtime_awards;
CREATE TRIGGER trg_overtime_claim_guard BEFORE UPDATE ON public.overtime_awards
FOR EACH ROW EXECUTE FUNCTION public.enforce_claim_amount_immutable();

CREATE OR REPLACE FUNCTION public.enforce_loan_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE protected text[] := ARRAY[
  'loan_amount','original_loan_amount','total_repayable','disbursed_amount','paid_amount',
  'remaining_balance','interest_rate','daily_interest_rate','monthly_installment','weekly_installment',
  'admin_approved','admin_approved_by','admin_approved_at','admin_rejection_reason',
  'penalty_amount','is_defaulted','approved_via_appeal','appeal_admin_voters',
  'counter_offer_amount','counter_offer_by','counter_offer_at','employee_email','employee_id'
];
BEGIN
  IF public.user_has_permission('Finance') OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;
  IF (SELECT COUNT(*) FROM unnest(protected) p
      WHERE to_jsonb(OLD)->p IS DISTINCT FROM to_jsonb(NEW)->p) > 0 THEN
    RAISE EXCEPTION 'Only Finance/Admin can change loan approval, amount or balance fields';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending_admin','pending') THEN
    RAISE EXCEPTION 'Only Finance/Admin can change loan status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loan_self_update_guard ON public.loans;
CREATE TRIGGER trg_loan_self_update_guard
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.enforce_loan_self_update_guard();

DROP POLICY IF EXISTS "Authenticated can issue form numbers" ON public.quality_form_numbers;
DROP POLICY IF EXISTS "Authenticated can update form numbers" ON public.quality_form_numbers;

CREATE POLICY "Quality staff can issue form numbers"
ON public.quality_form_numbers FOR INSERT TO authenticated
WITH CHECK (public.is_quality_or_admin());

CREATE POLICY "Quality staff can update form numbers"
ON public.quality_form_numbers FOR UPDATE TO authenticated
USING (public.is_quality_or_admin())
WITH CHECK (public.is_quality_or_admin());