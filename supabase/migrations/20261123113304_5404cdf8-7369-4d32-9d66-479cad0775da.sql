CREATE OR REPLACE FUNCTION public.auto_disburse_salary_advance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID; v_email TEXT; v_name TEXT; v_fee NUMERIC; v_ref TEXT;
BEGIN
  IF NEW.type <> 'Salary Advance' THEN RETURN NEW; END IF;
  IF NEW.admin_approved IS NOT TRUE THEN RETURN NEW; END IF;
  IF OLD.admin_approved IS TRUE THEN RETURN NEW; END IF;
  IF NEW.approval_stage IN ('completed', 'rejected') THEN RETURN NEW; END IF;
  v_email := COALESCE(NULLIF(NEW.details->>'employee_email', ''), NULLIF(NEW.details->>'employeeEmail', ''), NEW.requestedby);
  v_name := COALESCE(NULLIF(NEW.details->>'employee_name', ''), NULLIF(NEW.details->>'employeeName', ''), NEW.requestedby_name, NEW.requestedby);
  IF v_email IS NULL OR NEW.amount IS NULL OR NEW.amount <= 0 THEN RETURN NEW; END IF;
  v_user_id := get_unified_user_id(v_email);
  IF v_user_id IS NULL THEN
    RAISE WARNING 'Cannot resolve user for salary advance %, email=%', NEW.id, v_email;
    RETURN NEW;
  END IF;
  NEW.finance_approved := true;
  NEW.finance_approved_by := 'AUTO (Salary Advance - Admin-only policy)';
  NEW.finance_approved_at := NOW();
  NEW.approval_stage := 'completed';
  NEW.status := 'Approved';
  NEW.updated_at := NOW();
  INSERT INTO employee_salary_advances (employee_email, employee_name, original_amount, remaining_balance, minimum_payment, reason, status, created_by)
  VALUES (v_email, v_name, NEW.amount, NEW.amount, NEW.amount, COALESCE(NEW.description, 'Salary Advance Request'), 'active', COALESCE(NEW.admin_approved_by, 'Admin'));
  v_ref := 'SALARY-ADVANCE-' || NEW.id::text || '-' || extract(epoch from now())::bigint;
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (v_user_id, 'DEPOSIT', NEW.amount, v_ref,
    jsonb_build_object('source', 'salary_advance', 'request_id', NEW.id, 'description', 'Salary Advance disbursement – UGX ' || NEW.amount::text || ' (recoverable on 27th)'));
  -- 4% access fee charged on approval, deducted from the advance credit
  v_fee := round(NEW.amount * 0.04);
  IF v_fee > 0 THEN
    INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (v_user_id, 'FEE', -v_fee, v_ref || '-FEE', 'FEE',
      jsonb_build_object('type', 'salary_advance_access_fee', 'request_id', NEW.id,
        'description', 'Salary advance access fee (4%) – UGX ' || v_fee::text));
  END IF;
  RETURN NEW;
END;
$function$;