CREATE OR REPLACE FUNCTION public.treasury_account_post(p_account text, p_direction text, p_amount numeric, p_counter text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_ledger_id uuid DEFAULT NULL::uuid, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_performed_by text DEFAULT 'system'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_acc public.treasury_accounts%ROWTYPE; v_delta NUMERIC; v_new NUMERIC;
  v_meta jsonb := COALESCE(p_metadata,'{}'::jsonb);
  v_pool_flag boolean := COALESCE((p_metadata->>'lending_pool')::boolean,false);
  v_inv NUMERIC; v_wal NUMERIC; v_from_inv NUMERIC; v_from_wal NUMERIC; v_out NUMERIC; v_src text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;

  IF p_account = 'loans_overdrafts' AND NOT v_pool_flag THEN
    -- 1. Business money may not fund lending
    IF p_direction = 'credit' AND p_counter IN ('general','operations','fees_income','loyalty_fund','cash_at_bank','profits')
       AND NOT (v_meta ? 'overdraft_recovery') AND NOT (v_meta ? 'ledger_entry_id') AND p_ledger_id IS NULL THEN
      RAISE EXCEPTION 'LENDING_POOL_ONLY: Loans & Overdrafts can only be funded from User Wallets and Invest & Earn, not from %.', p_counter USING ERRCODE='P0001';
    END IF;

    -- 2. Real lending (money going to a borrower) is drawn from staff money
    IF p_direction = 'debit' AND COALESCE(p_counter,'external') IN ('external','user_wallets') THEN
      v_src := upper(COALESCE(v_meta->>'source',''));
      SELECT balance INTO v_inv FROM treasury_accounts WHERE code='invest_earn' FOR UPDATE;
      SELECT balance INTO v_wal FROM treasury_accounts WHERE code='user_wallets' FOR UPDATE;
      IF v_src IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT','LOAN') OR COALESCE(p_reference,'') ILIKE 'LOAN%' THEN
        SELECT COALESCE(sum(remaining_balance),0) INTO v_out FROM loans WHERE status IN ('active','approved','disbursed','overdue') AND remaining_balance > 0;
        v_out := v_out + (SELECT COALESCE(sum(outstanding_balance),0) FROM overdraft_accounts WHERE outstanding_balance > 0);
        IF v_out + p_amount > 0.5 * (GREATEST(v_inv,0) + GREATEST(v_wal,0)) THEN
          RAISE EXCEPTION 'LENDING_LIMIT: Money lent out (UGX %) plus this loan (UGX %) would pass 50%% of staff wallets and investments (limit UGX %).',
            to_char(v_out,'FM999,999,999,990'), to_char(p_amount,'FM999,999,999,990'), to_char(0.5*(GREATEST(v_inv,0)+GREATEST(v_wal,0)),'FM999,999,999,990') USING ERRCODE='P0001';
        END IF;
      END IF;
      v_from_inv := LEAST(p_amount, GREATEST(v_inv,0));
      v_from_wal := p_amount - v_from_inv;
      IF v_from_inv > 0 THEN
        PERFORM public.treasury_account_post('invest_earn','debit',v_from_inv,'loans_overdrafts',p_reference,NULL,p_email,p_name,'Lending pool: funded from Invest & Earn',p_performed_by,jsonb_build_object('lending_pool',true));
        PERFORM public.treasury_account_post('loans_overdrafts','credit',v_from_inv,'invest_earn',p_reference,NULL,p_email,p_name,'Lending pool: funded from Invest & Earn',p_performed_by,jsonb_build_object('lending_pool',true));
      END IF;
      IF v_from_wal > 0 THEN
        PERFORM public.treasury_account_post('user_wallets','debit',v_from_wal,'loans_overdrafts',p_reference,NULL,p_email,p_name,'Lending pool: funded from User Wallets',p_performed_by,jsonb_build_object('lending_pool',true));
        PERFORM public.treasury_account_post('loans_overdrafts','credit',v_from_wal,'user_wallets',p_reference,NULL,p_email,p_name,'Lending pool: funded from User Wallets',p_performed_by,jsonb_build_object('lending_pool',true));
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_acc FROM public.treasury_accounts WHERE code = p_account FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Treasury account % does not exist', p_account; END IF;
  v_delta := CASE WHEN p_direction = 'credit' THEN p_amount ELSE -p_amount END;
  v_new := v_acc.balance + v_delta;
  IF v_new < 0 AND NOT v_acc.allow_negative THEN
    RAISE EXCEPTION 'TREASURY_INSUFFICIENT: The % has only UGX % but this needs UGX %. Ask the Super Admin to fund the % before retrying.',
      v_acc.name, to_char(v_acc.balance,'FM999,999,999,990'), to_char(p_amount,'FM999,999,999,990'), v_acc.name
      USING ERRCODE = 'P0001', HINT = p_account;
  END IF;
  UPDATE public.treasury_accounts SET balance = v_new WHERE code = p_account;
  INSERT INTO public.treasury_account_entries (account_code, direction, amount, balance_after, counter_account, reference, ledger_entry_id,
     related_user_email, related_user_name, description, performed_by, metadata)
  VALUES (p_account, p_direction, p_amount, v_new, p_counter, p_reference, p_ledger_id, p_email, p_name, p_description, COALESCE(p_performed_by,'system'), v_meta);

  -- 3. Principal repaid returns to the staff pool (Invest & Earn); interest already goes to Profits
  IF p_account = 'loans_overdrafts' AND NOT v_pool_flag AND p_direction = 'credit'
     AND COALESCE(p_counter,'external') IN ('external','user_wallets','general') THEN
    PERFORM public.treasury_account_post('loans_overdrafts','debit',p_amount,'invest_earn',p_reference,NULL,p_email,p_name,'Lending pool: repayment returned to Invest & Earn',p_performed_by,jsonb_build_object('lending_pool',true));
    PERFORM public.treasury_account_post('invest_earn','credit',p_amount,'loans_overdrafts',p_reference,NULL,p_email,p_name,'Lending pool: repayment returned to Invest & Earn',p_performed_by,jsonb_build_object('lending_pool',true));
    v_new := v_new - p_amount;
  END IF;
  RETURN v_new;
END; $function$;