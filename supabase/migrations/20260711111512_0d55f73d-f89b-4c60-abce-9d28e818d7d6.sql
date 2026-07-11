
-- Reverse treasury profit when the underlying fee/interest is refunded or cancelled

CREATE OR REPLACE FUNCTION public.reverse_treasury_profit(
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

  -- Idempotency: skip if a reversal with this reference already exists
  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.treasury_pool_entries WHERE reference = p_reference
  ) THEN RETURN NULL; END IF;

  INSERT INTO public.treasury_pool_balance (id, current_balance)
    VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

  UPDATE public.treasury_pool_balance
     SET current_balance = COALESCE(current_balance,0) - p_amount,
         updated_at = now()
   WHERE id = 1
   RETURNING current_balance INTO v_new_balance;

  INSERT INTO public.treasury_pool_entries (
    direction, amount, channel, category, reference,
    related_user_email, related_user_name, description,
    performed_by, balance_after, metadata
  ) VALUES (
    'debit', p_amount, 'internal', 'fee', p_reference,
    p_user_email, p_user_name, p_description,
    'system', v_new_balance,
    COALESCE(p_metadata,'{}'::jsonb) || jsonb_build_object('reversal', true)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Expanded profit trigger: handles both new profits AND refunds/cancellations
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
  v_is_reversal boolean;
  v_reverses_src text;
  v_orig_ledger_id text;
  v_orig_src text;
BEGIN
  v_src := UPPER(COALESCE(NEW.source_category, ''));
  v_amt := ABS(COALESCE(NEW.amount, 0));
  IF v_amt = 0 THEN RETURN NEW; END IF;

  -- Detect a reversal/refund entry. Priority:
  --   1) metadata.reverses_source_category explicitly names the profit type
  --   2) metadata.refund_of_ledger_id / reverses_ledger_id points to a prior ledger row
  --   3) entry_type = 'REVERSAL' with a profit-source_category
  --   4) profit source_category posted with NEW.amount < 0
  v_reverses_src := UPPER(COALESCE(NEW.metadata->>'reverses_source_category',''));
  v_orig_ledger_id := COALESCE(NEW.metadata->>'refund_of_ledger_id', NEW.metadata->>'reverses_ledger_id', NEW.metadata->>'original_ledger_id');

  IF v_orig_ledger_id IS NOT NULL AND v_orig_ledger_id <> '' THEN
    BEGIN
      SELECT UPPER(COALESCE(source_category,'')) INTO v_orig_src
        FROM public.ledger_entries WHERE id = v_orig_ledger_id::uuid;
    EXCEPTION WHEN others THEN v_orig_src := NULL; END;
  END IF;

  v_is_reversal := (
    v_reverses_src IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE')
    OR COALESCE(v_orig_src,'') IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE')
    OR (NEW.entry_type::text = 'REVERSAL' AND v_src IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE'))
    OR (v_src IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE') AND COALESCE(NEW.amount,0) < 0)
  );

  -- Resolve the profit source label used for the reversal or new credit
  IF v_is_reversal THEN
    v_src := COALESCE(NULLIF(v_reverses_src,''), NULLIF(v_orig_src,''), v_src);
  END IF;

  IF v_src NOT IN ('OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','LOAN_INTEREST','STATEMENT_FEE') THEN
    RETURN NEW;
  END IF;

  v_label := CASE v_src
    WHEN 'OVERDRAFT_FEE' THEN 'Overdraft access fee'
    WHEN 'OVERDRAFT_INTEREST' THEN 'Overdraft daily interest'
    WHEN 'OVERDRAFT_PENALTY' THEN 'Overdraft penalty'
    WHEN 'LOAN_INTEREST' THEN 'Loan interest'
    WHEN 'STATEMENT_FEE' THEN 'Statement fee'
  END;

  SELECT email, name INTO v_email, v_name FROM public.employees
   WHERE auth_user_id::text = NEW.user_id OR email = NEW.user_id LIMIT 1;

  IF v_is_reversal THEN
    v_ref := 'PROFIT-REVERSAL-' || NEW.id::text;
    PERFORM public.reverse_treasury_profit(
      v_amt,
      'Reversal: ' || v_label || COALESCE(' — ' || (NEW.metadata->>'reason'), COALESCE(' — ' || (NEW.metadata->>'description'), '')),
      v_ref,
      v_email,
      v_name,
      jsonb_build_object('source','ledger_entries','ledger_id',NEW.id,'source_category',v_src,'profit_type',lower(v_src),'reversal',true,'original_ledger_id',v_orig_ledger_id)
    );
  ELSE
    v_ref := 'PROFIT-LEDGER-' || NEW.id::text;
    PERFORM public.post_treasury_profit(
      v_amt,
      v_label || COALESCE(' — ' || (NEW.metadata->>'description'), ''),
      v_ref,
      v_email,
      v_name,
      jsonb_build_object('source','ledger_entries','ledger_id',NEW.id,'source_category',v_src,'profit_type',lower(v_src))
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Loan-repayment profit trigger: also handle negative deltas (reversals of prior repayments)
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
  IF v_delta = 0 THEN RETURN NEW; END IF;

  SELECT loan_amount, total_repayable, employee_email, employee_name
    INTO v_loan FROM public.loans WHERE id = NEW.loan_id;
  IF NOT FOUND OR COALESCE(v_loan.total_repayable,0) <= 0 THEN RETURN NEW; END IF;

  v_interest_share := GREATEST(v_loan.total_repayable - v_loan.loan_amount, 0) / v_loan.total_repayable;
  v_profit := round(ABS(v_delta) * v_interest_share, 0);
  IF v_profit <= 0 THEN RETURN NEW; END IF;

  v_ref := 'PROFIT-LOAN-' || NEW.id::text || '-' || extract(epoch from now())::bigint::text;

  IF v_delta > 0 THEN
    PERFORM public.post_treasury_profit(
      v_profit,
      'Loan interest received (installment ' || COALESCE(NEW.installment_number::text,'?') || ')',
      v_ref,
      v_loan.employee_email,
      v_loan.employee_name,
      jsonb_build_object('source','loan_repayments','repayment_id',NEW.id,'loan_id',NEW.loan_id,'profit_type','loan_interest','payment_delta',v_delta)
    );
  ELSE
    PERFORM public.reverse_treasury_profit(
      v_profit,
      'Reversal: loan interest (installment ' || COALESCE(NEW.installment_number::text,'?') || ')',
      v_ref,
      v_loan.employee_email,
      v_loan.employee_name,
      jsonb_build_object('source','loan_repayments','repayment_id',NEW.id,'loan_id',NEW.loan_id,'profit_type','loan_interest','payment_delta',v_delta,'reversal',true)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- When a loan is cancelled/rejected, reverse any profit that was ever posted for it
CREATE OR REPLACE FUNCTION public.trg_loan_cancelled_reverse_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_profit numeric;
  v_ref text;
BEGIN
  IF LOWER(COALESCE(NEW.status,'')) NOT IN ('cancelled','canceled','rejected','reversed') THEN
    RETURN NEW;
  END IF;
  IF LOWER(COALESCE(OLD.status,'')) = LOWER(COALESCE(NEW.status,'')) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0)
    INTO v_total_profit
    FROM public.treasury_pool_entries
   WHERE metadata->>'loan_id' = NEW.id::text
     AND metadata->>'profit_type' = 'loan_interest';

  IF v_total_profit <= 0 THEN RETURN NEW; END IF;

  v_ref := 'PROFIT-LOAN-CANCEL-' || NEW.id::text;
  PERFORM public.reverse_treasury_profit(
    v_total_profit,
    'Reversal: loan ' || NEW.status || ' — profit rolled back',
    v_ref,
    NEW.employee_email,
    NEW.employee_name,
    jsonb_build_object('source','loans','loan_id',NEW.id,'profit_type','loan_interest','reason','loan_'||LOWER(NEW.status))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loan_cancelled_reverse_profit ON public.loans;
CREATE TRIGGER trg_loan_cancelled_reverse_profit
AFTER UPDATE OF status ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.trg_loan_cancelled_reverse_profit();
