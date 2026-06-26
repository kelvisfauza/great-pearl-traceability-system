
-- 1. Allow OVERDRAFT_PENALTY and STATEMENT_FEE as valid source categories
CREATE OR REPLACE FUNCTION public.validate_source_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source_category IS NOT NULL AND NEW.source_category NOT IN (
    'SELF_DEPOSIT','SYSTEM_AWARD','LOAN_DISBURSEMENT','LOAN_REPAYMENT',
    'TRANSFER_IN','INTERNAL_TRANSFER','SALARY','DAILY_SALARY','MONTHLY_SALARY',
    'EXPENSE_CREDIT','WITHDRAWAL','OVERDRAFT_DRAW','OVERDRAFT_FEE',
    'OVERDRAFT_RECOVERY','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY',
    'LOAN_INTEREST','INTEREST_ACCRUAL','STATEMENT_FEE','OTHER'
  ) THEN
    RAISE EXCEPTION 'Invalid source_category: %', NEW.source_category;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Helper that posts a profit entry into the treasury pool
CREATE OR REPLACE FUNCTION public.post_treasury_profit(
  p_amount numeric,
  p_description text,
  p_reference text,
  p_user_email text DEFAULT NULL,
  p_user_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance numeric;
  v_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;
  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.treasury_pool_entries WHERE reference = p_reference
  ) THEN RETURN NULL; END IF;

  INSERT INTO public.treasury_pool_balance (id, current_balance)
    VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

  UPDATE public.treasury_pool_balance
     SET current_balance = COALESCE(current_balance,0) + p_amount,
         updated_at = now()
   WHERE id = 1
   RETURNING current_balance INTO v_new_balance;

  INSERT INTO public.treasury_pool_entries (
    direction, amount, channel, category, reference,
    related_user_email, related_user_name, description,
    performed_by, balance_after, metadata
  ) VALUES (
    'credit', p_amount, 'internal', 'fee', p_reference,
    p_user_email, p_user_name, p_description,
    'system', v_new_balance, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 3. Trigger on ledger_entries to auto-post overdraft fees/interest/penalty/statement fees as treasury profits
CREATE OR REPLACE FUNCTION public.trg_ledger_to_treasury_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_src text;
  v_amt numeric;
  v_label text;
  v_ref text;
  v_email text;
  v_name text;
BEGIN
  v_src := UPPER(COALESCE(NEW.source_category, ''));
  IF v_src NOT IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE') THEN
    RETURN NEW;
  END IF;
  v_amt := ABS(COALESCE(NEW.amount, 0));
  IF v_amt = 0 THEN RETURN NEW; END IF;

  v_label := CASE v_src
    WHEN 'OVERDRAFT_FEE' THEN 'Overdraft access fee'
    WHEN 'OVERDRAFT_INTEREST' THEN 'Overdraft daily interest'
    WHEN 'OVERDRAFT_PENALTY' THEN 'Overdraft penalty'
    WHEN 'LOAN_INTEREST' THEN 'Loan interest'
    WHEN 'STATEMENT_FEE' THEN 'Statement fee'
  END;

  v_ref := 'PROFIT-LEDGER-' || NEW.id::text;

  SELECT email, name INTO v_email, v_name FROM public.employees
   WHERE auth_user_id::text = NEW.user_id OR email = NEW.user_id LIMIT 1;

  PERFORM public.post_treasury_profit(
    v_amt,
    v_label || COALESCE(' — ' || (NEW.metadata->>'description'), ''),
    v_ref,
    v_email,
    v_name,
    jsonb_build_object('source','ledger_entries','ledger_id',NEW.id,'source_category',v_src,'profit_type',lower(v_src))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_to_treasury_profit ON public.ledger_entries;
CREATE TRIGGER trg_ledger_to_treasury_profit
AFTER INSERT ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_to_treasury_profit();

-- 4. Trigger on loan_repayments — interest portion of each payment is profit
CREATE OR REPLACE FUNCTION public.trg_loan_repayment_to_treasury_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan RECORD;
  v_delta numeric;
  v_interest_share numeric;
  v_profit numeric;
  v_ref text;
BEGIN
  v_delta := COALESCE(NEW.amount_paid,0) - COALESCE(OLD.amount_paid,0);
  IF v_delta <= 0 THEN RETURN NEW; END IF;

  SELECT loan_amount, total_repayable, employee_email, employee_name
    INTO v_loan FROM public.loans WHERE id = NEW.loan_id;
  IF NOT FOUND OR COALESCE(v_loan.total_repayable,0) <= 0 THEN RETURN NEW; END IF;

  v_interest_share := GREATEST(v_loan.total_repayable - v_loan.loan_amount, 0) / v_loan.total_repayable;
  v_profit := round(v_delta * v_interest_share, 0);
  IF v_profit <= 0 THEN RETURN NEW; END IF;

  v_ref := 'PROFIT-LOAN-' || NEW.id::text || '-' || extract(epoch from now())::bigint::text;

  PERFORM public.post_treasury_profit(
    v_profit,
    'Loan interest received (installment ' || COALESCE(NEW.installment_number::text,'?') || ')',
    v_ref,
    v_loan.employee_email,
    v_loan.employee_name,
    jsonb_build_object('source','loan_repayments','repayment_id',NEW.id,'loan_id',NEW.loan_id,'profit_type','loan_interest','payment_delta',v_delta)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loan_repayment_to_treasury_profit ON public.loan_repayments;
CREATE TRIGGER trg_loan_repayment_to_treasury_profit
AFTER UPDATE OF amount_paid ON public.loan_repayments
FOR EACH ROW EXECUTE FUNCTION public.trg_loan_repayment_to_treasury_profit();

-- 5. Backfill historical: overdraft fees, interest, penalties, statement fees, loan interest
DO $$
DECLARE
  r RECORD;
  v_label text;
  v_amt numeric;
BEGIN
  FOR r IN
    SELECT id, user_id, source_category, amount, metadata
      FROM public.ledger_entries
     WHERE source_category IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE')
       AND amount < 0
     ORDER BY created_at ASC
  LOOP
    v_amt := ABS(r.amount);
    v_label := CASE r.source_category
      WHEN 'OVERDRAFT_FEE' THEN 'Overdraft access fee'
      WHEN 'OVERDRAFT_INTEREST' THEN 'Overdraft daily interest'
      WHEN 'OVERDRAFT_PENALTY' THEN 'Overdraft penalty'
      WHEN 'LOAN_INTEREST' THEN 'Loan interest'
      WHEN 'STATEMENT_FEE' THEN 'Statement fee'
    END;
    PERFORM public.post_treasury_profit(
      v_amt,
      v_label || ' (backfill)',
      'PROFIT-LEDGER-' || r.id::text,
      NULL, NULL,
      jsonb_build_object('source','ledger_entries','ledger_id',r.id,'source_category',r.source_category,'profit_type',lower(r.source_category),'backfill',true)
    );
  END LOOP;

  -- Loan interest backfill: paid_amount portion attributable to interest
  FOR r IN
    SELECT l.id AS loan_id, l.loan_amount, l.total_repayable, l.paid_amount,
           l.employee_email, l.employee_name
      FROM public.loans l
     WHERE COALESCE(l.paid_amount,0) > 0 AND COALESCE(l.total_repayable,0) > l.loan_amount
  LOOP
    v_amt := round(LEAST(r.paid_amount, r.total_repayable) * ((r.total_repayable - r.loan_amount)::numeric / r.total_repayable), 0);
    IF v_amt > 0 THEN
      PERFORM public.post_treasury_profit(
        v_amt,
        'Loan interest received (backfill)',
        'PROFIT-LOAN-BACKFILL-' || r.loan_id::text,
        r.employee_email, r.employee_name,
        jsonb_build_object('source','loans','loan_id',r.loan_id,'profit_type','loan_interest','backfill',true)
      );
    END IF;
  END LOOP;
END $$;
