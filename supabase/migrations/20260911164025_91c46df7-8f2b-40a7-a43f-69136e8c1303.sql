-- Split a ledger movement into the wallet-funded part and the overdraft-funded part.
-- p_exclude_self: TRUE when called from an AFTER trigger (NEW already counted in the sum).
CREATE OR REPLACE FUNCTION public.treasury_overdraft_portion(p_user_id text, p_amount numeric, p_exclude_self boolean DEFAULT false)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_before numeric; v_amt numeric;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_before FROM public.ledger_entries WHERE user_id::text = p_user_id::text;
  IF p_exclude_self THEN v_before := v_before - p_amount; END IF;
  v_amt := ABS(p_amount);
  IF p_amount < 0 THEN
    -- part of this debit that sits below zero
    RETURN LEAST(v_amt, GREATEST(0, -(v_before - v_amt)));
  ELSE
    -- part of this credit that repays an existing negative balance
    RETURN LEAST(v_amt, GREATEST(0, -v_before));
  END IF;
END; $$;

-- Record a blocked-overdraft alert outside the failing transaction is impossible,
-- so we let callers insert it; provide a tiny helper for edge functions.
CREATE OR REPLACE FUNCTION public.treasury_raise_alert(p_account text, p_amount numeric, p_reference text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_bal numeric;
BEGIN
  SELECT balance INTO v_bal FROM public.treasury_accounts WHERE code = p_account;
  IF EXISTS (SELECT 1 FROM public.treasury_alerts WHERE account_code = p_account AND alert_type = 'blocked_payout' AND reference = p_reference AND resolved_at IS NULL) THEN RETURN; END IF;
  INSERT INTO public.treasury_alerts (account_code, alert_type, amount_required, balance_at_alert, message, reference, metadata)
  VALUES (p_account, 'blocked_payout', p_amount, v_bal, p_message, p_reference, COALESCE(p_metadata,'{}'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.treasury_raise_alert(text, numeric, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.treasury_raise_alert(text, numeric, text, text, jsonb) TO service_role;

-- BEFORE INSERT guard: also verify Loans & Overdrafts can fund the below-zero part of a debit.
CREATE OR REPLACE FUNCTION public.trg_treasury_accounts_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_acc TEXT; v_amt NUMERIC; v_bal NUMERIC; v_name TEXT; v_allow BOOLEAN;
        v_principal NUMERIC; v_interest NUMERIC; v_pbal NUMERIC; v_od NUMERIC; v_src TEXT;
BEGIN
  v_amt := ABS(COALESCE(NEW.amount,0));
  IF v_amt = 0 THEN RETURN NEW; END IF;
  IF COALESCE((NEW.metadata->>'bypass_treasury_accounts')::boolean,false) THEN RETURN NEW; END IF;

  IF NEW.amount < 0 THEN
    v_src := UPPER(COALESCE(NEW.source_category,''));
    -- Synthetic accruals (interest/fees/penalties) are receivables, never blocked here.
    IF v_src IN ('OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY') THEN RETURN NEW; END IF;
    v_od := public.treasury_overdraft_portion(NEW.user_id::text, NEW.amount, false);
    IF v_od > 0 THEN
      SELECT balance, name INTO v_bal, v_name FROM public.treasury_accounts WHERE code = 'loans_overdrafts';
      IF v_bal < v_od THEN
        RAISE EXCEPTION 'TREASURY_INSUFFICIENT: % has only UGX % but this overdraft needs UGX %. Ask the Super Admin to fund the % first.',
          v_name, to_char(v_bal,'FM999,999,999,990'), to_char(v_od,'FM999,999,999,990'), v_name
          USING ERRCODE='P0001', HINT='loans_overdrafts';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  v_acc := public.treasury_resolve_account(NEW.source_category, NEW.metadata->>'type', NEW.entry_type::text, NEW.amount);
  IF v_acc IS NULL THEN RETURN NEW; END IF;

  IF v_acc = 'invest_earn' THEN
    v_principal := LEAST(v_amt, COALESCE((NEW.metadata->>'principal')::numeric, v_amt));
    v_interest := GREATEST(v_amt - v_principal, 0);
    SELECT balance, name INTO v_bal, v_name FROM public.treasury_accounts WHERE code='invest_earn';
    IF v_bal < v_principal THEN
      RAISE EXCEPTION 'TREASURY_INSUFFICIENT: % has only UGX % but this payout needs UGX %. Super Admin must fund it first.', v_name, to_char(v_bal,'FM999,999,999,990'), to_char(v_principal,'FM999,999,999,990') USING ERRCODE='P0001', HINT='invest_earn';
    END IF;
    IF v_interest > 0 THEN
      SELECT balance INTO v_pbal FROM public.treasury_accounts WHERE code='profits';
      IF v_pbal < v_interest THEN
        RAISE EXCEPTION 'TREASURY_INSUFFICIENT: Profits account has only UGX % but UGX % interest is due. Super Admin must fund Profits first.', to_char(v_pbal,'FM999,999,999,990'), to_char(v_interest,'FM999,999,999,990') USING ERRCODE='P0001', HINT='profits';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT balance, name, allow_negative INTO v_bal, v_name, v_allow FROM public.treasury_accounts WHERE code = v_acc;
  IF NOT v_allow AND v_bal < v_amt THEN
    RAISE EXCEPTION 'TREASURY_INSUFFICIENT: % has only UGX % but this credit needs UGX %. Ask the Super Admin to fund the % first.', v_name, to_char(v_bal,'FM999,999,999,990'), to_char(v_amt,'FM999,999,999,990'), v_name USING ERRCODE='P0001', HINT=v_acc;
  END IF;
  RETURN NEW;
END; $$;

-- AFTER INSERT posting: route the overdraft portion via Loans & Overdrafts.
CREATE OR REPLACE FUNCTION public.trg_treasury_accounts_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_acc TEXT; v_amt NUMERIC; v_email TEXT; v_name TEXT; v_desc TEXT; v_by TEXT; v_uid UUID;
        v_principal NUMERIC; v_interest NUMERIC; v_meta JSONB;
        v_od NUMERIC; v_wallet NUMERIC; v_src TEXT; v_lo_bal NUMERIC;
BEGIN
  v_amt := ABS(COALESCE(NEW.amount,0));
  IF v_amt = 0 THEN RETURN NEW; END IF;
  IF COALESCE((NEW.metadata->>'bypass_treasury_accounts')::boolean,false) THEN RETURN NEW; END IF;
  v_desc := COALESCE(NEW.metadata->>'description', NEW.entry_type::text);
  v_by := COALESCE(NEW.metadata->>'initiated_by', NEW.metadata->>'admin_email', 'system');
  BEGIN v_uid := NEW.user_id::uuid; EXCEPTION WHEN others THEN v_uid := NULL; END;
  SELECT email, name INTO v_email, v_name FROM public.employees
   WHERE (v_uid IS NOT NULL AND auth_user_id = v_uid) OR email = NEW.user_id LIMIT 1;
  v_meta := jsonb_build_object('ledger_entry_id', NEW.id, 'source', NEW.source_category, 'meta_type', NEW.metadata->>'type', 'auto', true);
  v_acc := public.treasury_resolve_account(NEW.source_category, NEW.metadata->>'type', NEW.entry_type::text, NEW.amount);
  v_src := UPPER(COALESCE(NEW.source_category,''));

  -- Portion of this movement that belongs to the overdraft (below-zero) zone.
  v_od := public.treasury_overdraft_portion(NEW.user_id::text, NEW.amount, true);
  v_wallet := v_amt - v_od;

  IF NEW.amount > 0 THEN
    -- Wallet credit: repaid overdraft returns to Loans & Overdrafts; the rest grows User Wallets.
    IF v_od > 0 THEN
      PERFORM public.treasury_account_post('loans_overdrafts','credit',v_od, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, 'Overdraft recovered — '||v_desc, v_by, v_meta || jsonb_build_object('overdraft_recovery', true));
    END IF;
    IF v_wallet > 0 THEN
      PERFORM public.treasury_account_post('user_wallets','credit',v_wallet, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, v_desc, v_by, v_meta);
    END IF;
    IF v_acc = 'invest_earn' THEN
      v_principal := LEAST(v_amt, COALESCE((NEW.metadata->>'principal')::numeric, v_amt));
      v_interest := GREATEST(v_amt - v_principal, 0);
      PERFORM public.treasury_account_post('invest_earn','debit',v_principal,'user_wallets',NEW.reference,NEW.id,v_email,v_name,'Investment principal returned — '||v_desc,v_by,v_meta);
      IF v_interest > 0 THEN
        PERFORM public.treasury_account_post('profits','debit',v_interest,'user_wallets',NEW.reference,NEW.id,v_email,v_name,'Investment interest paid — '||v_desc,v_by,v_meta);
      END IF;
    ELSIF v_acc IS NOT NULL THEN
      PERFORM public.treasury_account_post(v_acc,'debit',v_amt,'user_wallets',NEW.reference,NEW.id,v_email,v_name,v_desc,v_by,v_meta);
    END IF;
  ELSE
    -- Wallet debit: wallet-funded part leaves User Wallets; overdraft part is lent by Loans & Overdrafts.
    IF v_wallet > 0 THEN
      PERFORM public.treasury_account_post('user_wallets','debit',v_wallet, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, v_desc, v_by, v_meta);
    END IF;
    IF v_od > 0 THEN
      SELECT balance INTO v_lo_bal FROM public.treasury_accounts WHERE code='loans_overdrafts';
      IF v_src IN ('OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY') AND v_lo_bal < v_od THEN
        -- Receivable accrual while the lending pot is empty: fall back to User Wallets so the charge still posts.
        PERFORM public.treasury_account_post('user_wallets','debit',v_od, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, v_desc, v_by, v_meta || jsonb_build_object('overdraft_fallback', true));
      ELSE
        PERFORM public.treasury_account_post('loans_overdrafts','debit',v_od, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, 'Overdraft funding — '||v_desc, v_by, v_meta || jsonb_build_object('overdraft_draw', true));
      END IF;
    END IF;
    IF v_acc IS NOT NULL THEN
      PERFORM public.treasury_account_post(v_acc,'credit',v_amt,'user_wallets',NEW.reference,NEW.id,v_email,v_name,v_desc,v_by,v_meta);
    END IF;
  END IF;
  RETURN NEW;
END; $$;