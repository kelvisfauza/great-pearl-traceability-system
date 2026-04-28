CREATE OR REPLACE FUNCTION public.get_all_wallet_balances()
RETURNS TABLE(user_id text, wallet_balance numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    le.user_id,
    SUM(le.amount) as wallet_balance
  FROM public.ledger_entries le
  WHERE le.entry_type IN (
    'LOYALTY_REWARD',
    'BONUS',
    'DEPOSIT',
    'WITHDRAWAL',
    'ADJUSTMENT',
    'MONTHLY_SALARY',
    'ADVANCE_RECOVERY',
    'LOAN_DISBURSEMENT',
    'LOAN_REPAYMENT',
    'LOAN_RECOVERY'
  )
  GROUP BY le.user_id;
$$;

CREATE OR REPLACE FUNCTION public.enforce_withdrawal_control_on_approval_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ctrl jsonb;
  until_ts timestamptz;
BEGIN
  IF COALESCE(NEW.type, '') <> 'Withdrawal Request' THEN
    RETURN NEW;
  END IF;

  SELECT setting_value
  INTO ctrl
  FROM public.system_settings
  WHERE setting_key = 'withdrawal_control'
  LIMIT 1;

  IF COALESCE((ctrl ->> 'disabled')::boolean, false) = false THEN
    RETURN NEW;
  END IF;

  IF ctrl ? 'disabled_until' AND NULLIF(ctrl ->> 'disabled_until', '') IS NOT NULL THEN
    until_ts := (ctrl ->> 'disabled_until')::timestamptz;
    IF until_ts <= now() THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = COALESCE(NULLIF(ctrl ->> 'disabled_reason', ''), 'Withdrawals are temporarily paused by the administrator.'),
    ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_withdrawal_control_on_approval_requests ON public.approval_requests;

CREATE TRIGGER trg_enforce_withdrawal_control_on_approval_requests
BEFORE INSERT ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_withdrawal_control_on_approval_requests();