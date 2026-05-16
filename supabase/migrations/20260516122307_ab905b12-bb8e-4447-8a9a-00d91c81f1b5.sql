
-- =========================================================================
-- STEP 1: Dedupe loan_repayments rows that share (loan_id, payment_reference)
-- Keep the oldest row of each duplicate group, delete the rest.
-- =========================================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY loan_id, payment_reference
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.loan_repayments
  WHERE payment_reference IS NOT NULL
)
DELETE FROM public.loan_repayments lr
USING ranked r
WHERE lr.id = r.id AND r.rn > 1;

-- For loan 7385525f-... the surviving row had the wrong split amount (26473).
-- Set it to the ledger truth (105904) so the statement reconciles.
UPDATE public.loan_repayments
SET amount_due = 105904, amount_paid = 105904, status = 'paid'
WHERE loan_id = '7385525f-cfad-4dd2-a22e-a212edf4a4a5'
  AND payment_reference = 'MOMO-LOANREPAY-7385525f-1772712282237';

-- =========================================================================
-- STEP 2: Backfill missing loan_repayments rows for loan 273090bb...
-- (MoMo-direct + early wallet repayments that were posted to the ledger
-- but never written to loan_repayments).
-- =========================================================================
INSERT INTO public.loan_repayments
  (loan_id, installment_number, amount_due, amount_paid, due_date, paid_date, status, deducted_from, payment_reference, created_at)
VALUES
  -- MoMo-direct repayments
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 50000,  50000,  '2026-04-17', '2026-04-17', 'paid', 'momo_direct',
   'LOAN-MOMO-REPAY-273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd-1776448262544', '2026-04-17 17:51:02.587451+00'),
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 50000,  50000,  '2026-04-21', '2026-04-21', 'paid', 'momo_direct',
   'LOAN-MOMO-REPAY-273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd-1776795331531', '2026-04-21 18:15:31.562786+00'),
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 120000, 120000, '2026-04-26', '2026-04-26', 'paid', 'momo_direct',
   'LOAN-MOMO-REPAY-273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd-1777206959128', '2026-04-26 12:35:59.177562+00'),
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 39500,  39500,  '2026-04-27', '2026-04-27', 'paid', 'momo_direct',
   'LOAN-MOMO-REPAY-273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd-1777311102056', '2026-04-27 17:31:42.087699+00'),
  -- Early wallet repayments
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 28000,  28000,  '2026-04-21', '2026-04-21', 'paid', 'wallet',
   'LOANREPAY-WALLET-273090bb-1776795268733', '2026-04-21 18:14:27.895471+00'),
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 28000,  28000,  '2026-04-27', '2026-04-27', 'paid', 'wallet',
   'LOANREPAY-WALLET-273090bb-1777277222944', '2026-04-27 08:07:04.109248+00'),
  ('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd', 0, 42334,  42334,  '2026-04-28', '2026-04-28', 'paid', 'wallet',
   'LOANREPAY-WALLET-273090bb-1777369202534', '2026-04-28 09:40:03.782511+00')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- STEP 3: Hard uniqueness rule (now safe to enforce).
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS loan_repayments_loan_payref_uniq
  ON public.loan_repayments (loan_id, payment_reference)
  WHERE payment_reference IS NOT NULL;

-- =========================================================================
-- STEP 4: Recompute helper - rebuilds loans.paid_amount/remaining_balance
-- from ledger truth.
-- =========================================================================
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

  -- MoMo-direct repayments (negative LOAN_REPAYMENT entries tied to this loan)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_momo_paid
  FROM public.ledger_entries
  WHERE entry_type = 'LOAN_REPAYMENT'
    AND amount < 0
    AND (
      metadata->>'loan_id' = p_loan_id::text
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

-- =========================================================================
-- STEP 5: Apply recompute to the two affected loans
-- =========================================================================
SELECT public.recompute_loan_paid_from_ledger('273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd');
SELECT public.recompute_loan_paid_from_ledger('7385525f-cfad-4dd2-a22e-a212edf4a4a5');
