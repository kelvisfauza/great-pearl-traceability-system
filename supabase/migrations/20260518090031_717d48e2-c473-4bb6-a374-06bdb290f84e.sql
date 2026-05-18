CREATE OR REPLACE FUNCTION public.enforce_withdrawal_balance_on_approval_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email text;
  v_user_id text;
  v_balance numeric := 0;
  v_pending numeric := 0;
  v_reserve numeric := 0;
  v_available numeric := 0;
  v_has_loan boolean := false;
BEGIN
  IF COALESCE(NEW.type, '') <> 'Withdrawal Request' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount' USING ERRCODE = 'P0001';
  END IF;

  v_user_email := COALESCE(NEW.requestedby, '');
  IF v_user_email = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_user_id := public.get_unified_user_id(v_user_email);
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_balance := COALESCE(public.get_effective_wallet_balance(v_user_id), 0);
  EXCEPTION WHEN OTHERS THEN
    v_balance := 0;
  END;

  BEGIN
    v_pending := COALESCE(public.get_pending_wallet_commitments(v_user_id, v_user_email), 0);
  EXCEPTION WHEN OTHERS THEN
    v_pending := 0;
  END;

  BEGIN
    v_has_loan := COALESCE(public.has_active_loan_obligation(v_user_id::uuid), false);
  EXCEPTION WHEN OTHERS THEN
    v_has_loan := false;
  END;

  IF v_has_loan THEN
    v_reserve := 10000;
  END IF;

  v_available := GREATEST(0, v_balance - v_pending - v_reserve);

  IF NEW.amount > v_available THEN
    IF v_has_loan THEN
      RAISE EXCEPTION 'You have an active loan (as borrower or guarantor). UGX 10,000 must remain in your wallet. Available to withdraw: UGX %', trim(to_char(v_available, '999,999,999'))
        USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'Insufficient wallet balance. Available: UGX %', trim(to_char(v_available, '999,999,999'))
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_withdrawal_balance_on_approval_requests ON public.approval_requests;
CREATE TRIGGER trg_enforce_withdrawal_balance_on_approval_requests
BEFORE INSERT ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_withdrawal_balance_on_approval_requests();