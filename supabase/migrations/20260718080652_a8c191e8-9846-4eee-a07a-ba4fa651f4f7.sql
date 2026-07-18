
-- 1. Seasons
CREATE TABLE public.budget_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.budget_seasons TO authenticated;
GRANT ALL ON public.budget_seasons TO service_role;
ALTER TABLE public.budget_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone auth can view seasons" ON public.budget_seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage seasons" ON public.budget_seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));

-- 2. Allocations
CREATE TABLE public.budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.budget_seasons(id) ON DELETE SET NULL,
  employee_id uuid NOT NULL,
  category text NOT NULL,
  description text,
  allocated_amount numeric NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  spent_amount numeric NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  status text NOT NULL DEFAULT 'active',
  allocated_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ba_employee ON public.budget_allocations(employee_id);
CREATE INDEX idx_ba_season ON public.budget_allocations(season_id);
GRANT SELECT, INSERT, UPDATE ON public.budget_allocations TO authenticated;
GRANT ALL ON public.budget_allocations TO service_role;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own allocations" ON public.budget_allocations FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));
CREATE POLICY "Admins manage allocations" ON public.budget_allocations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));

-- 3. Ledger
CREATE TABLE public.budget_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  allocation_id uuid REFERENCES public.budget_allocations(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  description text,
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ble_employee ON public.budget_ledger_entries(employee_id, created_at DESC);
GRANT SELECT ON public.budget_ledger_entries TO authenticated;
GRANT ALL ON public.budget_ledger_entries TO service_role;
ALTER TABLE public.budget_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own budget ledger" ON public.budget_ledger_entries FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));

-- 4. Withdrawal requests
CREATE TABLE public.budget_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  allocation_id uuid NOT NULL REFERENCES public.budget_allocations(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  payout_mode text NOT NULL CHECK (payout_mode IN ('mobile_money','cash','personal_wallet')),
  provider text,
  recipient_name text NOT NULL,
  recipient_phone text,
  reason text NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  first_approver_id uuid,
  first_approved_at timestamptz,
  second_approver_id uuid,
  second_approved_at timestamptz,
  rejection_reason text,
  payout_reference text,
  payout_status text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bwr_employee ON public.budget_withdrawal_requests(employee_id);
CREATE INDEX idx_bwr_status ON public.budget_withdrawal_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.budget_withdrawal_requests TO authenticated;
GRANT ALL ON public.budget_withdrawal_requests TO service_role;
ALTER TABLE public.budget_withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employee view own budget wr" ON public.budget_withdrawal_requests FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));
CREATE POLICY "Employee create own budget wr" ON public.budget_withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Admins update budget wr" ON public.budget_withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role));

-- 5. Update trigger
CREATE OR REPLACE FUNCTION public.budget_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER trg_bs_touch BEFORE UPDATE ON public.budget_seasons FOR EACH ROW EXECUTE FUNCTION public.budget_touch_updated_at();
CREATE TRIGGER trg_ba_touch BEFORE UPDATE ON public.budget_allocations FOR EACH ROW EXECUTE FUNCTION public.budget_touch_updated_at();
CREATE TRIGGER trg_bwr_touch BEFORE UPDATE ON public.budget_withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.budget_touch_updated_at();

-- 6. Balance RPC
CREATE OR REPLACE FUNCTION public.get_budget_wallet_balance(_employee_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0) FROM public.budget_ledger_entries WHERE employee_id = _employee_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_budget_wallet_balance(uuid) TO authenticated;

-- 7. Allocate RPC
CREATE OR REPLACE FUNCTION public.allocate_budget_funds(
  _employee_id uuid, _season_id uuid, _category text, _description text, _amount numeric, _notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _alloc_id uuid; _bal numeric; _actor uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(_actor,'Administrator'::app_role) OR public.has_role(_actor,'Super Admin'::app_role)) THEN
    RAISE EXCEPTION 'Only administrators can allocate budget funds';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  INSERT INTO public.budget_allocations(season_id, employee_id, category, description, allocated_amount, allocated_by, notes)
  VALUES (_season_id, _employee_id, _category, _description, _amount, _actor, _notes)
  RETURNING id INTO _alloc_id;
  SELECT COALESCE(SUM(amount),0) INTO _bal FROM public.budget_ledger_entries WHERE employee_id = _employee_id;
  INSERT INTO public.budget_ledger_entries(employee_id, allocation_id, entry_type, amount, balance_after, description, created_by, metadata)
  VALUES (_employee_id, _alloc_id, 'ALLOCATION', _amount, _bal + _amount,
    format('Budget allocation: %s', _category), _actor,
    jsonb_build_object('category', _category, 'season_id', _season_id));
  RETURN _alloc_id;
END $$;
GRANT EXECUTE ON FUNCTION public.allocate_budget_funds(uuid,uuid,text,text,numeric,text) TO authenticated;

-- 8. Approve RPC
CREATE OR REPLACE FUNCTION public.approve_budget_withdrawal(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _req public.budget_withdrawal_requests%ROWTYPE; _actor uuid := auth.uid(); _bal numeric; _alloc public.budget_allocations%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_actor,'Administrator'::app_role) OR public.has_role(_actor,'Super Admin'::app_role)) THEN
    RAISE EXCEPTION 'Only administrators can approve';
  END IF;
  SELECT * INTO _req FROM public.budget_withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.employee_id = _actor THEN RAISE EXCEPTION 'You cannot approve your own request'; END IF;
  IF _req.status NOT IN ('pending','approved_1') THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  IF _req.status = 'pending' THEN
    UPDATE public.budget_withdrawal_requests
    SET status='approved_1', first_approver_id=_actor, first_approved_at=now()
    WHERE id=_request_id;
    RETURN jsonb_build_object('ok',true,'stage','first_approval');
  END IF;

  IF _req.first_approver_id = _actor THEN RAISE EXCEPTION 'Second approver must be a different administrator'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO _bal FROM public.budget_ledger_entries WHERE employee_id = _req.employee_id;
  IF _bal < _req.amount THEN RAISE EXCEPTION 'Insufficient budget balance'; END IF;

  SELECT * INTO _alloc FROM public.budget_allocations WHERE id = _req.allocation_id FOR UPDATE;
  IF (_alloc.allocated_amount - _alloc.spent_amount) < _req.amount THEN
    RAISE EXCEPTION 'Insufficient remaining amount on selected budget line';
  END IF;

  INSERT INTO public.budget_ledger_entries(employee_id, allocation_id, entry_type, amount, balance_after, description, reference_id, created_by, metadata)
  VALUES (_req.employee_id, _req.allocation_id, 'WITHDRAWAL', -_req.amount, _bal - _req.amount,
    format('Budget withdrawal: %s', _req.reason), _req.id, _actor,
    jsonb_build_object('payout_mode', _req.payout_mode, 'provider', _req.provider,
      'recipient_name', _req.recipient_name, 'recipient_phone', _req.recipient_phone));

  UPDATE public.budget_allocations SET spent_amount = spent_amount + _req.amount WHERE id = _req.allocation_id;

  UPDATE public.budget_withdrawal_requests
  SET status='completed', second_approver_id=_actor, second_approved_at=now(), completed_at=now()
  WHERE id=_request_id;

  RETURN jsonb_build_object('ok',true,'stage','completed','amount',_req.amount,'payout_mode',_req.payout_mode,
    'provider',_req.provider,'recipient_phone',_req.recipient_phone,'employee_id',_req.employee_id);
END $$;
GRANT EXECUTE ON FUNCTION public.approve_budget_withdrawal(uuid) TO authenticated;

-- 9. Reject RPC (refunds nothing since debit only happens on final approval)
CREATE OR REPLACE FUNCTION public.reject_budget_withdrawal(_request_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(_actor,'Administrator'::app_role) OR public.has_role(_actor,'Super Admin'::app_role)) THEN
    RAISE EXCEPTION 'Only administrators can reject';
  END IF;
  UPDATE public.budget_withdrawal_requests
  SET status='rejected', rejection_reason=_reason
  WHERE id=_request_id AND status IN ('pending','approved_1');
  IF NOT FOUND THEN RAISE EXCEPTION 'Cannot reject this request'; END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.reject_budget_withdrawal(uuid,text) TO authenticated;

-- 10. Whitelist BUDGET_TRANSFER for personal ledger transfers
CREATE OR REPLACE FUNCTION public.validate_source_category()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.source_category IS NOT NULL AND NEW.source_category NOT IN (
    'SELF_DEPOSIT','SYSTEM_AWARD','LOAN_DISBURSEMENT','LOAN_REPAYMENT',
    'TRANSFER_IN','INTERNAL_TRANSFER','SALARY','DAILY_SALARY','MONTHLY_SALARY',
    'EXPENSE_CREDIT','WITHDRAWAL','OVERDRAFT_DRAW','OVERDRAFT_FEE',
    'OVERDRAFT_RECOVERY','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY',
    'LOAN_INTEREST','INTEREST_ACCRUAL','STATEMENT_FEE',
    'SALARY_ADVANCE_DISBURSEMENT','SALARY_ADVANCE_REPAYMENT',
    'WITHDRAW_FEE','GOSENTE_FEE','BUDGET_TRANSFER',
    'OTHER'
  ) THEN
    RAISE EXCEPTION 'Invalid source_category: %', NEW.source_category;
  END IF;
  RETURN NEW;
END;
$function$;
