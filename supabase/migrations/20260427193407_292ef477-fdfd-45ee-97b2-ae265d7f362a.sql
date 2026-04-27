
ALTER TABLE public.treasury_pool_balance
  ADD COLUMN IF NOT EXISTS cash_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yo_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_balance NUMERIC NOT NULL DEFAULT 0;

UPDATE public.treasury_pool_balance
SET cash_balance = 4000000,
    yo_balance = 384973,
    current_balance = 4000000 + 384973 + COALESCE(bank_balance,0),
    updated_at = now()
WHERE id = 1;

INSERT INTO public.treasury_pool_entries
  (direction, amount, channel, category, reference, description, performed_by, balance_after, metadata)
VALUES
  ('credit', 4000000, 'cash', 'topup', 'SEED-CASH-' || to_char(now(),'YYYYMMDDHH24MISS'),
   'Initial cash bucket seed (manual)', 'system',
   (SELECT current_balance FROM public.treasury_pool_balance WHERE id = 1),
   jsonb_build_object('seed', true, 'bucket', 'cash')),
  ('credit', 384973, 'yo_payments', 'topup', 'SEED-YO-' || to_char(now(),'YYYYMMDDHH24MISS'),
   'Initial Yo Payments float seed', 'system',
   (SELECT current_balance FROM public.treasury_pool_balance WHERE id = 1),
   jsonb_build_object('seed', true, 'bucket', 'yo_payments'));

DROP FUNCTION IF EXISTS public.record_treasury_entry(public.treasury_direction, NUMERIC, public.treasury_channel, public.treasury_category, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_treasury_entry(
  p_direction public.treasury_direction,
  p_amount NUMERIC,
  p_channel public.treasury_channel,
  p_category public.treasury_category,
  p_reference TEXT,
  p_related_user_email TEXT,
  p_related_user_name TEXT,
  p_description TEXT,
  p_performed_by TEXT,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta NUMERIC;
  v_new_balance NUMERIC;
  v_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN NULL; END IF;
  v_delta := CASE WHEN p_direction = 'credit' THEN ABS(p_amount) ELSE -ABS(p_amount) END;

  IF p_channel = 'cash' THEN
    UPDATE public.treasury_pool_balance
      SET cash_balance = cash_balance + v_delta,
          current_balance = (cash_balance + v_delta) + yo_balance + COALESCE(bank_balance,0),
          updated_at = now()
      WHERE id = 1
      RETURNING current_balance INTO v_new_balance;
  ELSIF p_channel = 'bank' THEN
    UPDATE public.treasury_pool_balance
      SET bank_balance = bank_balance + v_delta,
          current_balance = cash_balance + yo_balance + (bank_balance + v_delta),
          updated_at = now()
      WHERE id = 1
      RETURNING current_balance INTO v_new_balance;
  ELSE
    UPDATE public.treasury_pool_balance
      SET yo_balance = yo_balance + v_delta,
          current_balance = cash_balance + (yo_balance + v_delta) + COALESCE(bank_balance,0),
          updated_at = now()
      WHERE id = 1
      RETURNING current_balance INTO v_new_balance;
  END IF;

  INSERT INTO public.treasury_pool_entries
    (direction, amount, channel, category, reference, related_user_email,
     related_user_name, description, performed_by, balance_after, metadata)
  VALUES
    (p_direction, ABS(p_amount), p_channel, p_category, p_reference,
     p_related_user_email, p_related_user_name, p_description, p_performed_by,
     v_new_balance, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_check_treasury_funds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket NUMERIC;
  v_amount NUMERIC;
  v_source TEXT;
  v_meta_type TEXT;
  v_bucket_label TEXT;
BEGIN
  v_amount := ABS(COALESCE(NEW.amount, 0));
  IF v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.amount >= 0 THEN RETURN NEW; END IF;

  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_meta_type := COALESCE(NEW.metadata->>'type','');

  IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN
    RETURN NEW;
  END IF;

  IF COALESCE((NEW.metadata->>'bypass_treasury_check')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
    SELECT cash_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Cash';
  ELSE
    SELECT yo_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Yo Payments float';
  END IF;

  IF v_bucket < v_amount THEN
    RAISE EXCEPTION 'Insufficient % funds: bucket has % UGX, this transaction requires % UGX. Please top up before processing.',
      v_bucket_label, v_bucket, v_amount USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_treasury_from_ledger()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  rec RECORD;
  v_email TEXT; v_name TEXT;
  v_source TEXT; v_meta_type TEXT;
  v_channel public.treasury_channel;
  v_category public.treasury_category;
  v_direction public.treasury_direction;
  v_amount NUMERIC;
  v_uid UUID;
  v_seed_cash NUMERIC; v_seed_yo NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN channel='cash' AND direction='credit' THEN amount
                      WHEN channel='cash' AND direction='debit' THEN -amount END),0),
    COALESCE(SUM(CASE WHEN channel='yo_payments' AND direction='credit' THEN amount
                      WHEN channel='yo_payments' AND direction='debit' THEN -amount END),0)
  INTO v_seed_cash, v_seed_yo
  FROM public.treasury_pool_entries
  WHERE COALESCE((metadata->>'seed')::boolean,false) = true;

  DELETE FROM public.treasury_pool_entries WHERE COALESCE((metadata->>'backfill')::boolean, false) = true;

  UPDATE public.treasury_pool_balance
    SET cash_balance = v_seed_cash,
        yo_balance = v_seed_yo,
        current_balance = v_seed_cash + v_seed_yo + COALESCE(bank_balance,0),
        updated_at = now()
    WHERE id = 1;

  FOR rec IN SELECT * FROM public.ledger_entries ORDER BY created_at ASC LOOP
    v_amount := ABS(COALESCE(rec.amount, 0));
    IF v_amount = 0 THEN CONTINUE; END IF;

    v_source := UPPER(COALESCE(rec.source_category, rec.metadata->>'source', ''));
    v_meta_type := COALESCE(rec.metadata->>'type','');

    IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN
      CONTINUE;
    END IF;

    IF rec.amount > 0 THEN v_direction := 'credit'; ELSE v_direction := 'debit'; END IF;

    BEGIN v_uid := rec.user_id::uuid; EXCEPTION WHEN others THEN v_uid := NULL; END;
    v_email := NULL; v_name := NULL;
    IF v_uid IS NOT NULL THEN
      SELECT email, name INTO v_email, v_name FROM public.employees WHERE auth_user_id = v_uid LIMIT 1;
    END IF;

    IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
      v_channel := 'cash';
    ELSIF v_source IN ('SELF_DEPOSIT','TOPUP') THEN
      v_channel := 'bank';
    ELSE
      v_channel := 'yo_payments';
    END IF;

    IF v_source = 'SALARY' THEN
      v_category := CASE WHEN v_direction = 'debit' THEN 'provider_payout' ELSE 'deposit' END;
    ELSIF v_source IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT') THEN
      v_category := 'provider_payout';
    ELSIF v_source = 'LOAN_REPAYMENT' THEN
      v_category := 'deposit';
    ELSIF v_source IN ('BONUS','OVERTIME','ALLOWANCE','PER_DIEM','SYSTEM_AWARD','LOYALTY','SELF_AWARD','EXPENSE_CREDIT','EXPENSE') THEN
      IF v_direction = 'credit' THEN v_direction := 'debit'; END IF;
      v_category := 'provider_payout';
    ELSIF v_source LIKE '%TRANSFER%' OR v_meta_type LIKE '%transfer%' THEN
      v_category := 'transfer';
    ELSIF v_meta_type LIKE '%provider%' OR v_meta_type LIKE '%meal%' THEN
      v_category := 'provider_payout';
    ELSIF rec.entry_type = 'DEPOSIT' OR v_direction = 'credit' THEN
      v_category := 'deposit'; v_direction := 'credit';
    ELSE
      v_category := 'withdrawal';
    END IF;

    PERFORM public.record_treasury_entry(
      v_direction, v_amount, v_channel, v_category,
      rec.reference, v_email, v_name,
      COALESCE(rec.metadata->>'description', rec.entry_type::text),
      COALESCE(rec.metadata->>'initiated_by','system'),
      jsonb_build_object('ledger_entry_id', rec.id, 'source', v_source,
                         'meta_type', v_meta_type, 'backfill', true)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_count,
    'final_balance', (SELECT current_balance FROM public.treasury_pool_balance WHERE id = 1),
    'cash_balance', (SELECT cash_balance FROM public.treasury_pool_balance WHERE id = 1),
    'yo_balance', (SELECT yo_balance FROM public.treasury_pool_balance WHERE id = 1));
END;
$$;
