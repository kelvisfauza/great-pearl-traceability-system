CREATE TABLE public.guarantor_recovery_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  guarantor_user_id text NOT NULL,
  guarantor_email text,
  guarantor_name text,
  borrower_email text,
  borrower_name text,
  recovered_amount numeric NOT NULL CHECK (recovered_amount > 0),
  recovery_reference text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by text,
  decided_at timestamptz,
  decision_notes text,
  refund_amount numeric NOT NULL DEFAULT 0,
  penalty_amount numeric NOT NULL DEFAULT 0,
  borrower_charged numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.guarantor_recovery_appeals TO authenticated;
GRANT ALL ON public.guarantor_recovery_appeals TO service_role;

ALTER TABLE public.guarantor_recovery_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guarantors can create their own appeals"
ON public.guarantor_recovery_appeals FOR INSERT TO authenticated
WITH CHECK (guarantor_user_id = auth.uid()::text);

CREATE POLICY "Guarantors and admins can view appeals"
ON public.guarantor_recovery_appeals FOR SELECT TO authenticated
USING (guarantor_user_id = auth.uid()::text OR public.is_loan_appeal_admin(auth.uid()));

CREATE POLICY "Admins can update appeals"
ON public.guarantor_recovery_appeals FOR UPDATE TO authenticated
USING (public.is_loan_appeal_admin(auth.uid()))
WITH CHECK (public.is_loan_appeal_admin(auth.uid()));

CREATE TRIGGER trg_guarantor_recovery_appeals_updated_at
BEFORE UPDATE ON public.guarantor_recovery_appeals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_guarantor_recovery_appeal(
  p_appeal_id uuid,
  p_uphold boolean,
  p_notes text DEFAULT NULL,
  p_penalty_rate numeric DEFAULT 0.10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appeal public.guarantor_recovery_appeals%ROWTYPE;
  v_loan public.loans%ROWTYPE;
  v_borrower_id text;
  v_penalty numeric;
  v_total numeric;
  v_ref text;
  v_actor text;
BEGIN
  IF NOT public.is_loan_appeal_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only administrators can decide guarantor appeals');
  END IF;

  SELECT * INTO v_appeal FROM public.guarantor_recovery_appeals WHERE id = p_appeal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Appeal not found');
  END IF;
  IF v_appeal.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Appeal already decided');
  END IF;

  v_actor := COALESCE(public.current_user_email(), auth.uid()::text);

  IF NOT p_uphold THEN
    UPDATE public.guarantor_recovery_appeals
       SET status = 'rejected', decided_by = v_actor, decided_at = now(), decision_notes = p_notes
     WHERE id = p_appeal_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  SELECT * INTO v_loan FROM public.loans WHERE id = v_appeal.loan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Loan not found');
  END IF;

  v_borrower_id := public.get_unified_user_id(v_loan.employee_email);
  IF v_borrower_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Could not resolve borrower account');
  END IF;

  v_penalty := ROUND(v_appeal.recovered_amount * GREATEST(p_penalty_rate, 0), 0);
  v_total := v_appeal.recovered_amount + v_penalty;
  v_ref := 'GTRAPPEAL-' || REPLACE(p_appeal_id::text, '-', '') ;

  -- 1. Refund the guarantor in full
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_appeal.guarantor_user_id, 'ADJUSTMENT', v_appeal.recovered_amount, v_ref || '-REFUND',
    'GUARANTOR_APPEAL_REFUND',
    jsonb_build_object(
      'description', 'Refund of guarantor recovery for ' || COALESCE(v_loan.employee_name, v_loan.employee_email) || '''s loan (appeal upheld)',
      'loan_id', v_loan.id, 'appeal_id', p_appeal_id, 'bypass_treasury_check', true
    )
  );

  -- 2. Charge the borrower the recovered amount back (overdraft absorbs shortfall)
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_borrower_id, 'LOAN_REPAYMENT', -v_appeal.recovered_amount, v_ref || '-RECHARGE',
    'LOAN_REPAYMENT',
    jsonb_build_object(
      'description', 'Loan amount recovered back from borrower after guarantor appeal upheld',
      'loan_id', v_loan.id, 'appeal_id', p_appeal_id, 'bypass_treasury_check', true
    )
  );

  -- 3. Penalty on the borrower
  IF v_penalty > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_borrower_id, 'ADJUSTMENT', -v_penalty, v_ref || '-PENALTY',
      'LOAN_PENALTY',
      jsonb_build_object(
        'description', 'Loan penalty (' || ROUND(GREATEST(p_penalty_rate,0) * 100) || '%) for forcing guarantor recovery',
        'loan_id', v_loan.id, 'appeal_id', p_appeal_id, 'bypass_treasury_check', true
      )
    );
  END IF;

  -- 4. Loan keeps running: penalty is added to the outstanding balance so
  --    interest / late charges continue to accrue on it.
  UPDATE public.loans
     SET penalty_amount = COALESCE(penalty_amount, 0) + v_penalty,
         total_repayable = COALESCE(total_repayable, 0) + v_penalty,
         remaining_balance = GREATEST(0, COALESCE(remaining_balance, 0)) + v_penalty,
         status = CASE WHEN status = 'completed' THEN 'active' ELSE status END,
         updated_at = now()
   WHERE id = v_loan.id;

  UPDATE public.guarantor_recovery_appeals
     SET status = 'upheld', decided_by = v_actor, decided_at = now(), decision_notes = p_notes,
         refund_amount = v_appeal.recovered_amount, penalty_amount = v_penalty, borrower_charged = v_total
   WHERE id = p_appeal_id;

  RETURN jsonb_build_object(
    'ok', true, 'status', 'upheld',
    'refunded', v_appeal.recovered_amount,
    'penalty', v_penalty,
    'borrower_charged', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_guarantor_recovery_appeal(uuid, boolean, text, numeric) TO authenticated;