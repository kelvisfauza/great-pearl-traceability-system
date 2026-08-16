-- 1) Guard loan INSERTs: borrowers cannot self-approve/fund their own loans
CREATE OR REPLACE FUNCTION public.sg_guard_loan_self_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  -- Regular employees may only file a fresh, unapproved request for themselves
  IF NEW.employee_email IS NULL
     OR lower(NEW.employee_email) IS DISTINCT FROM lower(coalesce(public.get_current_user_email(), '')) THEN
    RAISE EXCEPTION 'You may only create loan requests for yourself.';
  END IF;

  IF COALESCE(NEW.admin_approved, false) THEN
    RAISE EXCEPTION 'Only Finance/Admin may create pre-approved loans.';
  END IF;

  IF COALESCE(NEW.guarantor_approved, false) THEN
    RAISE EXCEPTION 'Guarantor approval cannot be set at creation time.';
  END IF;

  IF COALESCE(NEW.status, 'pending') NOT IN ('pending', 'pending_admin', 'pending_guarantor') THEN
    RAISE EXCEPTION 'New loan requests must start in a pending status.';
  END IF;

  NEW.admin_approved := false;
  NEW.guarantor_approved := false;
  NEW.disbursed_amount := 0;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_sg_guard_loan_self_insert ON public.loans;
CREATE TRIGGER zz_sg_guard_loan_self_insert
BEFORE INSERT ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.sg_guard_loan_self_insert();

-- 2) Restrict milling momo transaction inserts to milling/finance/admin staff
DROP POLICY IF EXISTS "Authenticated users can insert milling momo transactions" ON public.milling_momo_transactions;
CREATE POLICY "Milling Finance Admin can insert milling momo transactions"
ON public.milling_momo_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_milling_access()
  OR public.user_has_permission('Finance')
  OR public.is_current_user_admin()
);

-- 3) USSD payment logs: only the service role (IPN edge functions) may insert
DROP POLICY IF EXISTS "Allow public insert for IPN callbacks" ON public.ussd_payment_logs;
CREATE POLICY "Service role can insert ussd payment logs"
ON public.ussd_payment_logs
FOR INSERT
TO service_role
WITH CHECK (true);

REVOKE INSERT ON public.ussd_payment_logs FROM authenticated, anon;
GRANT ALL ON public.ussd_payment_logs TO service_role;