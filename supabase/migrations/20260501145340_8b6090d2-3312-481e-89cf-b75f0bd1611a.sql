
-- ============================================================
-- PART 1: Disburse Benson's stuck UGX 50,000 advance now
-- ============================================================

-- Mark the approval request as fully completed
UPDATE approval_requests
SET
  finance_approved = true,
  finance_approved_by = 'System (Admin-only policy)',
  finance_approved_at = NOW(),
  approval_stage = 'completed',
  status = 'Approved',
  updated_at = NOW()
WHERE id = 'e11ed484-5cc4-422e-8bdd-7a6239847b64';

-- Create the outstanding advance row (so 27th payroll recovers it)
INSERT INTO employee_salary_advances (
  employee_email, employee_name, original_amount, remaining_balance,
  minimum_payment, reason, status, created_by
)
VALUES (
  'bwambalebenson@greatpearlcoffee.com',
  'Bwambale Benson',
  50000,
  50000,
  50000,
  'Salary Advance Request (auto-disbursed under new admin-only policy)',
  'active',
  'System'
);

-- Credit Benson's wallet with the advance
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
SELECT
  get_unified_user_id('bwambalebenson@greatpearlcoffee.com'),
  'DEPOSIT',
  50000,
  'SALARY-ADVANCE-e11ed484-' || extract(epoch from now())::bigint,
  jsonb_build_object(
    'source', 'salary_advance',
    'request_id', 'e11ed484-5cc4-422e-8bdd-7a6239847b64',
    'description', 'Salary Advance disbursement – UGX 50,000 (recoverable on 27th)'
  );

-- ============================================================
-- PART 2: Trigger — admin approval of a Salary Advance now
--   * auto-completes the workflow (no Finance step)
--   * creates the outstanding advance row
--   * credits the borrower's wallet
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_disburse_salary_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_name TEXT;
BEGIN
  -- Only fire for Salary Advance type, when admin just approved
  IF NEW.type <> 'Salary Advance' THEN RETURN NEW; END IF;
  IF NEW.admin_approved IS NOT TRUE THEN RETURN NEW; END IF;
  IF OLD.admin_approved IS TRUE THEN RETURN NEW; END IF; -- no double-fire

  -- Skip if already completed or rejected
  IF NEW.approval_stage IN ('completed', 'rejected') THEN RETURN NEW; END IF;

  -- Resolve borrower from request fields
  v_email := COALESCE(
    NULLIF(NEW.details->>'employee_email', ''),
    NULLIF(NEW.details->>'employeeEmail', ''),
    NEW.requestedby
  );
  v_name := COALESCE(
    NULLIF(NEW.details->>'employee_name', ''),
    NULLIF(NEW.details->>'employeeName', ''),
    NEW.requestedby_name,
    NEW.requestedby
  );

  IF v_email IS NULL OR NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_user_id := get_unified_user_id(v_email);
  IF v_user_id IS NULL THEN
    RAISE WARNING 'Cannot resolve user for salary advance %, email=%', NEW.id, v_email;
    RETURN NEW;
  END IF;

  -- Auto-complete the approval workflow (skip Finance entirely)
  NEW.finance_approved := true;
  NEW.finance_approved_by := 'System (Admin-only policy)';
  NEW.finance_approved_at := NOW();
  NEW.approval_stage := 'completed';
  NEW.status := 'Approved';
  NEW.updated_at := NOW();

  -- Outstanding advance ledger (recovered on 27th)
  INSERT INTO employee_salary_advances (
    employee_email, employee_name, original_amount, remaining_balance,
    minimum_payment, reason, status, created_by
  )
  VALUES (
    v_email, v_name, NEW.amount, NEW.amount, NEW.amount,
    COALESCE(NEW.description, 'Salary Advance Request'),
    'active',
    COALESCE(NEW.admin_approved_by, 'Admin')
  );

  -- Credit borrower's wallet
  INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
  VALUES (
    v_user_id,
    'DEPOSIT',
    NEW.amount,
    'SALARY-ADVANCE-' || NEW.id::text || '-' || extract(epoch from now())::bigint,
    jsonb_build_object(
      'source', 'salary_advance',
      'request_id', NEW.id,
      'description', 'Salary Advance disbursement – UGX ' || NEW.amount::text || ' (recoverable on 27th)'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_disburse_salary_advance ON approval_requests;

CREATE TRIGGER trg_auto_disburse_salary_advance
BEFORE UPDATE OF admin_approved ON approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_disburse_salary_advance();
