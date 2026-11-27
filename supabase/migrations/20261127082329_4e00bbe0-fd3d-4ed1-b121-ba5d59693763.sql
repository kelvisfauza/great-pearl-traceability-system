-- 1) Budget allocations: no self-allocation
CREATE OR REPLACE FUNCTION public.allocate_budget_funds(_employee_id uuid, _season_id uuid, _category text, _description text, _amount numeric, _notes text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _alloc_id uuid; _bal numeric; _actor uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(_actor,'Administrator'::app_role) OR public.has_role(_actor,'Super Admin'::app_role)) THEN
    RAISE EXCEPTION 'Only administrators can allocate budget funds';
  END IF;
  IF _employee_id = _actor OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = _employee_id AND e.auth_user_id = _actor) THEN
    RAISE EXCEPTION 'You cannot allocate budget funds to yourself';
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
END $function$;

-- 2) Budget withdrawal approvals cannot be forged
CREATE OR REPLACE FUNCTION public.guard_budget_withdrawal_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- trusted server code
  IF NEW.employee_id IS DISTINCT FROM OLD.employee_id OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.recipient_phone IS DISTINCT FROM OLD.recipient_phone OR NEW.payout_mode IS DISTINCT FROM OLD.payout_mode
     OR NEW.allocation_id IS DISTINCT FROM OLD.allocation_id THEN
    RAISE EXCEPTION 'Saved withdrawal details cannot be changed';
  END IF;
  IF NEW.first_approver_id IS DISTINCT FROM OLD.first_approver_id AND NEW.first_approver_id IS NOT NULL
     AND (NEW.first_approver_id <> auth.uid() OR OLD.employee_id = auth.uid()) THEN
    RAISE EXCEPTION 'You can only record your own approval';
  END IF;
  IF NEW.second_approver_id IS DISTINCT FROM OLD.second_approver_id AND NEW.second_approver_id IS NOT NULL
     AND (NEW.second_approver_id <> auth.uid() OR OLD.employee_id = auth.uid()) THEN
    RAISE EXCEPTION 'You can only record your own approval';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_budget_withdrawal_update ON public.budget_withdrawal_requests;
CREATE TRIGGER trg_guard_budget_withdrawal_update BEFORE UPDATE ON public.budget_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_budget_withdrawal_update();

-- 3) No self-awarded bonuses
CREATE OR REPLACE FUNCTION public.guard_bonus_self_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT email INTO v_email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_email IS NULL THEN SELECT email INTO v_email FROM auth.users WHERE id = auth.uid(); END IF;
  IF lower(coalesce(NEW.employee_email,'')) = lower(coalesce(v_email,'#')) THEN
    RAISE EXCEPTION 'You cannot award a bonus to yourself';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.amount IS DISTINCT FROM OLD.amount AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'A claimed bonus cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_bonus_self_award ON public.bonuses;
CREATE TRIGGER trg_guard_bonus_self_award BEFORE INSERT OR UPDATE OF employee_email, amount ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.guard_bonus_self_award();

-- 4) Auto-invest email is fixed to the owner's account
CREATE OR REPLACE FUNCTION public.guard_auto_invest_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_current_user_admin() THEN RETURN NEW; END IF;
  NEW.user_email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  IF TG_OP = 'UPDATE' THEN NEW.user_id := OLD.user_id; NEW.user_email := OLD.user_email; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_auto_invest_email ON public.salary_auto_invest;
CREATE TRIGGER trg_guard_auto_invest_email BEFORE INSERT OR UPDATE ON public.salary_auto_invest
FOR EACH ROW EXECUTE FUNCTION public.guard_auto_invest_email();

-- 5) Start automatic withdrawal review from the server, not the browser
CREATE OR REPLACE FUNCTION public.wake_withdrawal_auto_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'Withdrawal Request' AND NEW.status = 'Pending Admin'
     AND coalesce(NEW.details->>'request_type','') = 'withdrawal'
     AND upper(coalesce(NEW.channel,'')) = 'MOBILE_MONEY' AND coalesce(NEW.amount,0) <= 500000 THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/auto-approve-withdrawal',
        headers := private_edge.header() || '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('requestId', NEW.id),
        timeout_milliseconds := 30000);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_wake_withdrawal_auto_review ON public.approval_requests;
CREATE TRIGGER trg_wake_withdrawal_auto_review AFTER INSERT ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.wake_withdrawal_auto_review();