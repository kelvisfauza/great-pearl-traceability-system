-- =====================================================================
-- TREASURY ACCOUNTS (multi-account treasury redesign)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.treasury_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'fund', -- fund | liability | income | receivable
  balance NUMERIC NOT NULL DEFAULT 0,
  low_balance_threshold NUMERIC NOT NULL DEFAULT 0,
  allow_negative BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  last_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.treasury_accounts TO authenticated;
GRANT ALL ON public.treasury_accounts TO service_role;
ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view treasury accounts" ON public.treasury_accounts;
CREATE POLICY "Admins view treasury accounts" ON public.treasury_accounts
  FOR SELECT TO authenticated USING (public.can_manage_users());

CREATE TABLE IF NOT EXISTS public.treasury_account_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL REFERENCES public.treasury_accounts(code),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  counter_account TEXT,               -- other account in the movement, or 'external'
  reference TEXT,
  ledger_entry_id UUID,
  related_user_email TEXT,
  related_user_name TEXT,
  description TEXT,
  performed_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tae_account_created ON public.treasury_account_entries(account_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tae_ledger ON public.treasury_account_entries(ledger_entry_id);
GRANT SELECT ON public.treasury_account_entries TO authenticated;
GRANT ALL ON public.treasury_account_entries TO service_role;
ALTER TABLE public.treasury_account_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view treasury entries" ON public.treasury_account_entries;
CREATE POLICY "Admins view treasury entries" ON public.treasury_account_entries
  FOR SELECT TO authenticated USING (public.can_manage_users());

CREATE TABLE IF NOT EXISTS public.treasury_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT,
  alert_type TEXT NOT NULL, -- insufficient | low_balance | drift
  amount_required NUMERIC,
  balance_at_alert NUMERIC,
  message TEXT NOT NULL,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treasury_alerts_open ON public.treasury_alerts(created_at DESC) WHERE resolved_at IS NULL;
GRANT SELECT, UPDATE ON public.treasury_alerts TO authenticated;
GRANT ALL ON public.treasury_alerts TO service_role;
ALTER TABLE public.treasury_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view treasury alerts" ON public.treasury_alerts;
CREATE POLICY "Admins view treasury alerts" ON public.treasury_alerts
  FOR SELECT TO authenticated USING (public.can_manage_users());
DROP POLICY IF EXISTS "Admins resolve treasury alerts" ON public.treasury_alerts;
CREATE POLICY "Admins resolve treasury alerts" ON public.treasury_alerts
  FOR UPDATE TO authenticated USING (public.can_manage_users()) WITH CHECK (public.can_manage_users());

CREATE OR REPLACE FUNCTION public.treasury_accounts_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_treasury_accounts_touch ON public.treasury_accounts;
CREATE TRIGGER trg_treasury_accounts_touch BEFORE UPDATE ON public.treasury_accounts
  FOR EACH ROW EXECUTE FUNCTION public.treasury_accounts_touch();

-- Seed accounts
INSERT INTO public.treasury_accounts (code, name, description, kind, low_balance_threshold, allow_negative, sort_order) VALUES
 ('general',          'General Account',          'Salaries, bonuses, allowances, per diem, overtime and admin adjustments are paid from here.', 'fund', 500000, false, 10),
 ('loyalty_fund',     'Loyalty Rewards Fund',     'Budget for loyalty points / activity rewards credited to staff wallets.', 'fund', 100000, false, 20),
 ('operations',       'Operations / Procurement', 'Meal plans, service providers, requisitions and approved expense credits.', 'fund', 300000, false, 30),
 ('loans_overdrafts', 'Loans & Overdrafts',       'Lending fund. Disbursements and overdraft draws leave here; principal repayments return here.', 'fund', 500000, false, 40),
 ('invest_earn',      'Invest & Earn Savings',    'Staff savings locked in Invest & Earn. Principal is repaid from here at maturity.', 'fund', 0, false, 50),
 ('profits',          'Profits / Retained Earnings', 'Loan and overdraft interest, penalties and statement fees. Pays investment interest.', 'income', 0, false, 60),
 ('fees_income',      'Fees & Charges Income',    'Withdrawal fees, GosentePay fees and other service charges.', 'income', 0, false, 70),
 ('user_wallets',     'User Wallets',             'Total money the company holds on behalf of staff wallets (liability).', 'liability', 0, true, 80)
ON CONFLICT (code) DO NOTHING;

-- Opening balance for User Wallets = today's total wallet balances
DO $$
DECLARE v_total NUMERIC; BEGIN
  SELECT COALESCE(SUM(wallet_balance),0) INTO v_total FROM public.get_all_wallet_balances();
  UPDATE public.treasury_accounts SET balance = v_total WHERE code = 'user_wallets' AND balance = 0
    AND NOT EXISTS (SELECT 1 FROM public.treasury_account_entries WHERE account_code='user_wallets');
  IF v_total <> 0 THEN
    INSERT INTO public.treasury_account_entries (account_code, direction, amount, balance_after, counter_account, reference, description, performed_by, metadata)
    SELECT 'user_wallets', CASE WHEN v_total > 0 THEN 'credit' ELSE 'debit' END, ABS(v_total), v_total, 'external', 'OPENING-BALANCE', 'Opening balance — total staff wallet balances at go-live', 'system', '{"opening":true}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM public.treasury_account_entries WHERE reference='OPENING-BALANCE');
  END IF;
END $$;

-- =====================================================================
-- Core posting primitive
-- =====================================================================
CREATE OR REPLACE FUNCTION public.treasury_account_post(
  p_account TEXT, p_direction TEXT, p_amount NUMERIC,
  p_counter TEXT DEFAULT NULL, p_reference TEXT DEFAULT NULL, p_ledger_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL, p_name TEXT DEFAULT NULL, p_description TEXT DEFAULT NULL,
  p_performed_by TEXT DEFAULT 'system', p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_acc public.treasury_accounts%ROWTYPE; v_delta NUMERIC; v_new NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;
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
  VALUES (p_account, p_direction, p_amount, v_new, p_counter, p_reference, p_ledger_id, p_email, p_name, p_description, COALESCE(p_performed_by,'system'), COALESCE(p_metadata,'{}'::jsonb));
  RETURN v_new;
END; $$;
REVOKE ALL ON FUNCTION public.treasury_account_post(TEXT,TEXT,NUMERIC,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;

-- Map a ledger row to its funding / destination account.
-- Returns NULL when the movement is external (deposit/withdrawal) or wallet-to-wallet.
CREATE OR REPLACE FUNCTION public.treasury_resolve_account(p_source TEXT, p_meta_type TEXT, p_entry_type TEXT, p_amount NUMERIC)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT := UPPER(COALESCE(p_source,'')); t TEXT := LOWER(COALESCE(p_meta_type,'')); e TEXT := UPPER(COALESCE(p_entry_type,''));
BEGIN
  -- wallet-to-wallet & reversals: no account movement beyond user_wallets
  IF t IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror','wallet_transfer','wallet_transfer_out','wallet_transfer_in','wallet_transfer_reversal','transfer_reversal')
     OR s IN ('TRANSFER','TRANSFER_IN','TRANSFER_OUT','INTERNAL_TRANSFER','WALLET_TRANSFER','REVERSAL','REFUND') THEN
    RETURN NULL;
  END IF;
  IF p_amount > 0 THEN
    -- money entering a wallet: which fund pays?
    IF t LIKE 'investment_%' OR s = 'INVEST_MATURITY' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('SYSTEM_AWARD','LOYALTY','SELF_AWARD','MEETING_BONUS') OR e IN ('LOYALTY_REWARD','HOST_MEETING_BONUS','MEETING_ATTENDANCE_BONUS') THEN RETURN 'loyalty_fund'; END IF;
    IF s IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT','LOAN','OVERDRAFT_DRAW') OR e = 'LOAN_DISBURSEMENT' THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('EXPENSE_CREDIT','EXPENSE','MEAL','PROVIDER','BUDGET_ALLOCATION','BUDGET_WITHDRAWAL','BUDGET_TRANSFER') OR t LIKE '%meal%' OR t LIKE '%provider%' OR t LIKE '%expense%' THEN RETURN 'operations'; END IF;
    IF s IN ('SALARY','BONUS','OVERTIME','OVERTIME_AWARD','ALLOWANCE','PER_DIEM','SALARY_ADVANCE','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') OR e IN ('MONTHLY_SALARY','BONUS','ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL; -- external deposit / topup / unknown => only user_wallets moves
  ELSE
    -- money leaving a wallet: where does it land?
    IF t IN ('investment_lock','auto_salary_investment') OR s = 'INVESTMENT' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('LOAN_INTEREST','OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY','LOAN_PENALTY','STATEMENT_FEE') THEN RETURN 'profits'; END IF;
    IF s IN ('WITHDRAW_FEE','GOSENTE_FEE','FEE') THEN RETURN 'fees_income'; END IF;
    IF s IN ('LOAN_REPAYMENT','OVERDRAFT_REPAY','OVERDRAFT_RECOVERY','SALARY_ADVANCE_REPAYMENT','SALARY_ADVANCE') OR e IN ('LOAN_REPAYMENT','LOAN_RECOVERY','ADVANCE_RECOVERY') THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('SYSTEM_DEDUCTION','PENALTY','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL; -- external withdrawal
  END IF;
END; $$;

-- BEFORE INSERT: block wallet credits whose funding account is empty
CREATE OR REPLACE FUNCTION public.trg_treasury_accounts_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_acc TEXT; v_amt NUMERIC; v_bal NUMERIC; v_name TEXT; v_allow BOOLEAN;
        v_principal NUMERIC; v_interest NUMERIC; v_pbal NUMERIC;
BEGIN
  v_amt := ABS(COALESCE(NEW.amount,0));
  IF v_amt = 0 OR NEW.amount < 0 THEN RETURN NEW; END IF;
  IF COALESCE((NEW.metadata->>'bypass_treasury_accounts')::boolean,false) THEN RETURN NEW; END IF;
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

-- AFTER INSERT: move money between accounts
CREATE OR REPLACE FUNCTION public.trg_treasury_accounts_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_acc TEXT; v_amt NUMERIC; v_email TEXT; v_name TEXT; v_desc TEXT; v_by TEXT; v_uid UUID;
        v_principal NUMERIC; v_interest NUMERIC; v_meta JSONB;
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

  IF NEW.amount > 0 THEN
    -- wallet credit: user_wallets grows; funding account shrinks
    PERFORM public.treasury_account_post('user_wallets','credit',v_amt, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, v_desc, v_by, v_meta);
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
    -- wallet debit: user_wallets shrinks; destination account grows
    PERFORM public.treasury_account_post('user_wallets','debit',v_amt, COALESCE(v_acc,'external'), NEW.reference, NEW.id, v_email, v_name, v_desc, v_by, v_meta);
    IF v_acc IS NOT NULL THEN
      PERFORM public.treasury_account_post(v_acc,'credit',v_amt,'user_wallets',NEW.reference,NEW.id,v_email,v_name,v_desc,v_by,v_meta);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_treasury_accounts_check ON public.ledger_entries;
CREATE TRIGGER trg_treasury_accounts_check BEFORE INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_treasury_accounts_check();
DROP TRIGGER IF EXISTS trg_treasury_accounts_post ON public.ledger_entries;
CREATE TRIGGER trg_treasury_accounts_post AFTER INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_treasury_accounts_post();

-- =====================================================================
-- Super Admin operations
-- =====================================================================
CREATE OR REPLACE FUNCTION public.treasury_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE (e.auth_user_id = auth.uid() OR lower(e.email) = lower(COALESCE(public.current_user_email(),'')))
      AND e.status = 'Active'
      AND (e.role = 'Super Admin' OR lower(e.email) = 'fauzakusa@greatpearlcoffee.com')
  ) OR public.is_super_admin(auth.uid());
$$;

-- Fund an account with external money (Yo / GosentePay / cash / bank)
CREATE OR REPLACE FUNCTION public.treasury_fund_account(
  p_account TEXT, p_amount NUMERIC, p_channel TEXT DEFAULT 'yo_payments', p_description TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new NUMERIC; v_ref TEXT; v_by TEXT;
BEGIN
  IF NOT public.treasury_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the Super Admin can fund treasury accounts');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero'); END IF;
  IF p_account = 'user_wallets' THEN RETURN jsonb_build_object('ok', false, 'error', 'User Wallets is a liability account and cannot be funded directly'); END IF;
  v_by := COALESCE(public.current_user_email(), 'super_admin');
  v_ref := 'FUND-' || UPPER(p_account) || '-' || to_char(now(),'YYYYMMDDHH24MISS');
  v_new := public.treasury_account_post(p_account,'credit',p_amount,'external',v_ref,NULL,NULL,NULL,
             COALESCE(p_description,'Account funded by Super Admin'), v_by,
             jsonb_build_object('manual', true, 'channel', p_channel));
  -- keep the legacy float pool in step
  BEGIN
    PERFORM public.record_treasury_entry('credit', p_amount,
      CASE WHEN p_channel IN ('cash','bank') THEN p_channel::public.treasury_channel ELSE 'yo_payments'::public.treasury_channel END,
      'topup', v_ref, NULL, NULL, 'Funding ' || p_account || ': ' || COALESCE(p_description,''), v_by,
      jsonb_build_object('treasury_account', p_account));
  EXCEPTION WHEN others THEN NULL; END;
  UPDATE public.treasury_alerts SET resolved_at = now() WHERE account_code = p_account AND resolved_at IS NULL AND alert_type IN ('insufficient','low_balance');
  RETURN jsonb_build_object('ok', true, 'reference', v_ref, 'balance', v_new);
END; $$;
GRANT EXECUTE ON FUNCTION public.treasury_fund_account(TEXT,NUMERIC,TEXT,TEXT) TO authenticated;

-- Move money between two accounts (e.g. Profits -> General, General -> Loyalty fund)
CREATE OR REPLACE FUNCTION public.treasury_move_funds(
  p_from TEXT, p_to TEXT, p_amount NUMERIC, p_description TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref TEXT; v_by TEXT;
BEGIN
  IF NOT public.treasury_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the Super Admin can move money between accounts');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero'); END IF;
  IF p_from = p_to THEN RETURN jsonb_build_object('ok', false, 'error', 'Choose two different accounts'); END IF;
  IF 'user_wallets' IN (p_from, p_to) THEN RETURN jsonb_build_object('ok', false, 'error', 'User Wallets can only move through staff wallet transactions'); END IF;
  v_by := COALESCE(public.current_user_email(), 'super_admin');
  v_ref := 'MOVE-' || to_char(now(),'YYYYMMDDHH24MISS');
  BEGIN
    PERFORM public.treasury_account_post(p_from,'debit',p_amount,p_to,v_ref,NULL,NULL,NULL,COALESCE(p_description,'Transfer to '||p_to),v_by,'{"manual":true}'::jsonb);
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;
  PERFORM public.treasury_account_post(p_to,'credit',p_amount,p_from,v_ref,NULL,NULL,NULL,COALESCE(p_description,'Transfer from '||p_from),v_by,'{"manual":true}'::jsonb);
  UPDATE public.treasury_alerts SET resolved_at = now() WHERE account_code = p_to AND resolved_at IS NULL AND alert_type IN ('insufficient','low_balance');
  RETURN jsonb_build_object('ok', true, 'reference', v_ref);
END; $$;
GRANT EXECUTE ON FUNCTION public.treasury_move_funds(TEXT,TEXT,NUMERIC,TEXT) TO authenticated;

-- Update an account's low-balance threshold
CREATE OR REPLACE FUNCTION public.treasury_set_threshold(p_account TEXT, p_threshold NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.treasury_is_super_admin() THEN RETURN jsonb_build_object('ok', false, 'error', 'Only the Super Admin can change thresholds'); END IF;
  UPDATE public.treasury_accounts SET low_balance_threshold = GREATEST(COALESCE(p_threshold,0),0) WHERE code = p_account;
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.treasury_set_threshold(TEXT,NUMERIC) TO authenticated;

-- Record a blocked-payment alert (called by app/edge functions after a TREASURY_INSUFFICIENT error)
CREATE OR REPLACE FUNCTION public.treasury_log_insufficient(p_account TEXT, p_amount NUMERIC, p_reference TEXT DEFAULT NULL, p_context TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal NUMERIC; v_name TEXT; v_id UUID;
BEGIN
  SELECT balance, name INTO v_bal, v_name FROM public.treasury_accounts WHERE code = p_account;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- de-duplicate: one open alert per account per 30 minutes
  SELECT id INTO v_id FROM public.treasury_alerts WHERE account_code = p_account AND alert_type='insufficient' AND resolved_at IS NULL AND created_at > now() - interval '30 minutes' LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.treasury_alerts (account_code, alert_type, amount_required, balance_at_alert, message, reference, metadata)
  VALUES (p_account, 'insufficient', p_amount, v_bal,
          format('%s blocked a payment of UGX %s — balance is UGX %s.%s', v_name, to_char(COALESCE(p_amount,0),'FM999,999,999,990'), to_char(COALESCE(v_bal,0),'FM999,999,999,990'), COALESCE(' Context: '||p_context,'')),
          p_reference, jsonb_build_object('context', p_context))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.treasury_log_insufficient(TEXT,NUMERIC,TEXT,TEXT) TO authenticated;

-- Overview for the treasury page (admins)
CREATE OR REPLACE FUNCTION public.get_treasury_accounts_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_accounts JSONB; v_alerts JSONB; v_expected NUMERIC; v_gosente NUMERIC; v_yo NUMERIC; v_yo_at TIMESTAMPTZ;
BEGIN
  IF NOT public.can_manage_users() THEN RETURN jsonb_build_object('ok', false, 'error', 'Admin access required'); END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order), '[]'::jsonb) INTO v_accounts FROM public.treasury_accounts a WHERE a.is_active;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_alerts
    FROM (SELECT * FROM public.treasury_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 50) x;
  SELECT COALESCE(SUM(balance),0) INTO v_expected FROM public.treasury_accounts WHERE is_active;
  SELECT COALESCE(balance,0) INTO v_gosente FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  SELECT last_yo_synced_balance, last_yo_synced_at INTO v_yo, v_yo_at FROM public.treasury_pool_balance WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'accounts', v_accounts, 'alerts', v_alerts,
    'expected_float', v_expected, 'yo_balance', COALESCE(v_yo,0), 'yo_synced_at', v_yo_at,
    'gosente_balance', COALESCE(v_gosente,0), 'actual_float', COALESCE(v_yo,0) + COALESCE(v_gosente,0),
    'drift', (COALESCE(v_yo,0) + COALESCE(v_gosente,0)) - v_expected,
    'is_super_admin', public.treasury_is_super_admin());
END; $$;
GRANT EXECUTE ON FUNCTION public.get_treasury_accounts_overview() TO authenticated;

-- Drift alert threshold setting
INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'treasury_drift_threshold', '{"amount": 50000}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'treasury_drift_threshold');