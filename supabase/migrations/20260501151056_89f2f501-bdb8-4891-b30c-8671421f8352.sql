-- 1. Refund Bwambale Benson's declined instant withdrawal (UGX 41,000)
UPDATE public.instant_withdrawals
SET payout_status = 'declined', completed_at = now()
WHERE id = 'eeb64268-a89b-4b4d-8c58-d66ffdfdd226'
  AND payout_status = 'pending_approval';

INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT 'eba97d3e-f098-467a-ad78-d0b9639d76a8'::uuid,
       'DEPOSIT',
       41000,
       'REFUND-INSTANT-WD-eeb64268-a89b-4b4d-8c58-d66ffdfdd226',
       'SYSTEM_AWARD',
       jsonb_build_object(
         'type', 'instant_withdrawal_refund',
         'original_ref', 'INSTANT-WD-1777648005527',
         'reason', 'Manually declined by admin',
         'description', 'Refund for declined instant withdrawal of UGX 41,000'
       )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE reference = 'REFUND-INSTANT-WD-eeb64268-a89b-4b4d-8c58-d66ffdfdd226'
);

-- 2. Helper: detect active loan obligation (borrower OR guarantor)
CREATE OR REPLACE FUNCTION public.has_active_loan_obligation(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_exists boolean;
BEGIN
  -- Resolve email from auth_user_id
  SELECT email INTO v_email FROM public.employees WHERE auth_user_id = p_user_id LIMIT 1;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id LIMIT 1;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.loans
    WHERE status = 'active'
      AND (
        employee_id = p_user_id
        OR guarantor_id = p_user_id
        OR (v_email IS NOT NULL AND (employee_email = v_email OR guarantor_email = v_email))
      )
  ) INTO v_exists;

  RETURN COALESCE(v_exists, false);
END;
$$;

-- 3. Update validate_withdrawal_balance to reserve UGX 10,000 when user has an active loan
CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_available numeric;
  v_reserve numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM ledger_entries
  WHERE user_id = p_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM withdrawal_requests
  WHERE user_id = p_user_id::text
    AND status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance');

  -- Loan minimum balance enforcement: keep UGX 10,000 in wallet if borrower or guarantor on active loan
  IF public.has_active_loan_obligation(p_user_id) THEN
    v_reserve := 10000;
  END IF;

  v_available := GREATEST(0, v_balance - v_pending - v_reserve);

  IF p_amount > v_available THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;