
-- ============================================================
-- FIX 1: Re-allocate Bwambale Benson's loan fc46f1a6 installments
-- Total wallet recoveries = UGX 154,500 against UGX 165,000 repayable
-- Correct allocation (oldest-first cascade):
--   Installment 1 (UGX 82,500): fully paid
--   Installment 2 (UGX 82,500): partial UGX 72,000 (10,500 still owed)
-- ============================================================

UPDATE loan_repayments SET
  amount_paid = 82500,
  status = 'paid',
  paid_date = '2026-04-17',
  deducted_from = 'Wallet Repayment (re-allocated)',
  payment_reference = 'REALLOC-2026-05-01'
WHERE loan_id = 'fc46f1a6-51e5-4189-8fc8-cc7149d71049'
  AND installment_number = 1;

UPDATE loan_repayments SET
  amount_paid = 72000,
  status = 'pending',
  paid_date = NULL,
  deducted_from = 'Wallet Repayment (re-allocated)',
  payment_reference = 'REALLOC-2026-05-01',
  overdue_days = 0,
  penalty_applied = 0
WHERE loan_id = 'fc46f1a6-51e5-4189-8fc8-cc7149d71049'
  AND installment_number = 2;

-- Reset loan-level missed/penalty flags since Inst 1 is now fully cleared
UPDATE loans SET
  missed_installments = 0,
  is_defaulted = false,
  penalty_amount = 0
WHERE id = 'fc46f1a6-51e5-4189-8fc8-cc7149d71049';

-- ============================================================
-- FIX 2: Auto-cascade trigger on loan_repayments
-- Whenever ANY repayment row is updated, ensure the global
-- waterfall invariant holds: oldest unpaid installment must be
-- fully settled before any newer installment receives funds.
-- This protects against ANY code path that updates installments
-- out of order.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cascade_loan_repayment_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan_id UUID;
  v_total_paid NUMERIC;
  v_inst RECORD;
  v_remaining NUMERIC;
  v_apply NUMERIC;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Determine which loan we are reallocating for
  v_loan_id := COALESCE(NEW.loan_id, OLD.loan_id);

  -- Sum every cent currently allocated across this loan's installments
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
  FROM loan_repayments
  WHERE loan_id = v_loan_id;

  v_remaining := v_total_paid;

  -- Re-distribute oldest-first
  FOR v_inst IN
    SELECT id, installment_number, amount_due, due_date
    FROM loan_repayments
    WHERE loan_id = v_loan_id
    ORDER BY installment_number ASC
  LOOP
    v_apply := LEAST(v_remaining, v_inst.amount_due);
    v_remaining := v_remaining - v_apply;

    UPDATE loan_repayments
    SET
      amount_paid = v_apply,
      status = CASE
        WHEN v_apply >= v_inst.amount_due THEN 'paid'
        WHEN v_apply > 0 AND v_inst.due_date < v_today THEN 'overdue'
        WHEN v_inst.due_date < v_today THEN 'overdue'
        ELSE 'pending'
      END,
      paid_date = CASE WHEN v_apply >= v_inst.amount_due THEN COALESCE(paid_date, v_today) ELSE NULL END
    WHERE id = v_inst.id
      AND (amount_paid IS DISTINCT FROM v_apply
           OR status IS DISTINCT FROM CASE
             WHEN v_apply >= v_inst.amount_due THEN 'paid'
             WHEN v_inst.due_date < v_today THEN 'overdue'
             ELSE 'pending'
           END);
  END LOOP;

  RETURN NULL; -- AFTER trigger
END;
$$;

-- Drop any prior version
DROP TRIGGER IF EXISTS trg_cascade_loan_repayment_allocation ON loan_repayments;

-- Use a statement-level AFTER trigger to avoid recursion (function updates the same table)
CREATE TRIGGER trg_cascade_loan_repayment_allocation
AFTER INSERT OR UPDATE OF amount_paid ON loan_repayments
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.cascade_loan_repayment_allocation();
