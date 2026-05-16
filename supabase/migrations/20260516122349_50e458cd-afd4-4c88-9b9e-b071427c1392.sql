
CREATE OR REPLACE FUNCTION public.recompute_loan_paid_from_ledger(p_loan_id uuid)
RETURNS TABLE(out_loan_id uuid, old_paid numeric, new_paid numeric, new_remaining numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short text := substring(p_loan_id::text, 1, 8);
  v_momo_paid numeric := 0;
  v_wallet_paid numeric := 0;
  v_total_repayable numeric;
  v_old_paid numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
BEGIN
  SELECT total_repayable, paid_amount
    INTO v_total_repayable, v_old_paid
  FROM public.loans WHERE id = p_loan_id;

  IF v_total_repayable IS NULL THEN
    RAISE EXCEPTION 'Loan % not found', p_loan_id;
  END IF;

  -- MoMo-direct repayments: accept LOAN_REPAYMENT *or* WITHDRAWAL entry types,
  -- matched by metadata->>loan_id or by MoMo reference patterns.
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_momo_paid
  FROM public.ledger_entries
  WHERE entry_type IN ('LOAN_REPAYMENT', 'WITHDRAWAL')
    AND amount < 0
    AND (
      (entry_type = 'LOAN_REPAYMENT' AND metadata->>'loan_id' = p_loan_id::text)
      OR reference LIKE 'LOAN-MOMO-REPAY-' || p_loan_id::text || '%'
      OR reference LIKE 'LOAN-MOMO-REPAY-' || v_short || '%'
      OR reference LIKE 'MOMO-LOANREPAY-' || v_short || '%'
    );

  -- Wallet repayments (negative WITHDRAWAL with LOANREPAY-WALLET-<short>-*)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_wallet_paid
  FROM public.ledger_entries
  WHERE entry_type = 'WITHDRAWAL'
    AND amount < 0
    AND reference LIKE 'LOANREPAY-WALLET-' || v_short || '%';

  v_new_paid := v_momo_paid + v_wallet_paid;
  v_new_remaining := GREATEST(0, v_total_repayable - v_new_paid);

  UPDATE public.loans
  SET paid_amount = v_new_paid,
      remaining_balance = v_new_remaining,
      status = CASE WHEN v_new_remaining <= 0 THEN 'completed' ELSE status END,
      updated_at = now()
  WHERE id = p_loan_id;

  out_loan_id := p_loan_id;
  old_paid := v_old_paid;
  new_paid := v_new_paid;
  new_remaining := v_new_remaining;
  RETURN NEXT;
END;
$$;

SELECT public.recompute_loan_paid_from_ledger('7385525f-cfad-4dd2-a22e-a212edf4a4a5');
SELECT public.recompute_loan_paid_from_ledger('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd');
