CREATE OR REPLACE FUNCTION public.enforce_loan_self_update_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := public.get_current_user_email();
BEGIN
  IF auth.uid() IS NULL OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  -- Borrower accepting a management counter offer: figures are computed by
  -- accept_loan_counter_offer, never supplied by the browser.
  IF current_setting('app.loan_counter_accept', true) = OLD.id::text THEN
    RETURN NEW;
  END IF;

  IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
     OR NEW.interest_rate IS DISTINCT FROM OLD.interest_rate
     OR NEW.total_repayable IS DISTINCT FROM OLD.total_repayable
     OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
     OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment
     OR NEW.disbursed_amount IS DISTINCT FROM OLD.disbursed_amount
     OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
     OR NEW.remaining_balance IS DISTINCT FROM OLD.remaining_balance
     OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Only Finance/Admin can modify loan financial or approval fields.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending','pending_admin','pending_guarantor','guarantor_declined')
  THEN
    RAISE EXCEPTION 'Only Finance/Admin can change loan status to %', NEW.status;
  END IF;

  IF (NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
      OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
      OR NEW.guarantor_name IS DISTINCT FROM OLD.guarantor_name
      OR NEW.guarantor_phone IS DISTINCT FROM OLD.guarantor_phone
      OR NEW.guarantor2_email IS DISTINCT FROM OLD.guarantor2_email
      OR NEW.guarantor2_id IS DISTINCT FROM OLD.guarantor2_id
      OR NEW.guarantor2_name IS DISTINCT FROM OLD.guarantor2_name
      OR NEW.guarantor2_phone IS DISTINCT FROM OLD.guarantor2_phone)
     AND lower(COALESCE(OLD.employee_email,'')) IS DISTINCT FROM v_email
  THEN
    RAISE EXCEPTION 'Guarantor identity fields are immutable.';
  END IF;

  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) IS DISTINCT FROM v_email)
  THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;

  IF (NEW.guarantor2_approved IS DISTINCT FROM OLD.guarantor2_approved)
     AND (OLD.guarantor2_email IS NULL OR lower(OLD.guarantor2_email) IS DISTINCT FROM v_email)
  THEN
    RAISE EXCEPTION 'Only the named second guarantor may respond to this loan.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_loan_counter_offer(p_loan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(public.get_current_user_email());
  l public.loans%ROWTYPE;
  v_amt numeric; v_months int; v_rate numeric; v_max numeric;
  v_interest numeric; v_total numeric; v_inst numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in again.'; END IF;
  SELECT * INTO l FROM public.loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF lower(COALESCE(l.employee_email,'')) <> v_email THEN RAISE EXCEPTION 'Only the borrower can accept this offer'; END IF;
  IF l.status <> 'counter_offered' THEN RAISE EXCEPTION 'This loan has no open counter offer'; END IF;
  v_amt := l.counter_offer_amount;
  IF v_amt IS NULL OR v_amt <= 0 THEN RAISE EXCEPTION 'Counter offer amount missing'; END IF;
  v_months := COALESCE(l.duration_months, 0);

  SELECT r, m INTO v_rate, v_max FROM (VALUES
    ('quick',10,35),('long_term',10,35),('pure_salary',15,45),('business',8,30)
  ) AS c(t,r,m) WHERE c.t = COALESCE(l.loan_type,'quick');
  IF v_rate IS NULL THEN v_rate := 10; v_max := 35; END IF;

  IF l.repayment_frequency = 'bullet' THEN
    v_interest := v_amt * 0.35;
  ELSE
    v_interest := LEAST(v_amt * v_rate / 100 * v_months, v_amt * v_max / 100);
  END IF;
  v_total := ceil(v_amt + v_interest);
  IF l.repayment_frequency = 'bullet' THEN v_inst := v_total;
  ELSIF l.repayment_frequency = 'monthly' THEN v_inst := CASE WHEN v_months > 0 THEN ceil(v_total / v_months) ELSE 0 END;
  ELSE v_inst := CASE WHEN v_months > 0 THEN ceil(v_total / (v_months * 4)) ELSE 0 END;
  END IF;

  PERFORM set_config('app.loan_counter_accept', p_loan_id::text, true);
  UPDATE public.loans SET
    loan_amount = v_amt,
    original_loan_amount = COALESCE(l.original_loan_amount, l.loan_amount),
    total_repayable = v_total,
    remaining_balance = v_total,
    monthly_installment = CASE WHEN l.repayment_frequency = 'weekly' THEN NULL ELSE v_inst END,
    weekly_installment = CASE WHEN l.repayment_frequency = 'weekly' THEN v_inst ELSE NULL END,
    status = 'pending_admin'
  WHERE id = p_loan_id;
  PERFORM set_config('app.loan_counter_accept', '', true);

  RETURN jsonb_build_object('ok', true, 'loan_amount', v_amt, 'total_repayable', v_total, 'installment', v_inst);
END $$;
REVOKE ALL ON FUNCTION public.accept_loan_counter_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_loan_counter_offer(uuid) TO authenticated;