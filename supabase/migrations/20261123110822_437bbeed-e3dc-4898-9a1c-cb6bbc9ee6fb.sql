CREATE OR REPLACE FUNCTION public.alert_borrow_to_invest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_loan numeric := 0; v_recent numeric := 0; v_od numeric := 0; v_msg text;
BEGIN
  SELECT coalesce(sum(remaining_balance) FILTER (WHERE status IN ('active','approved','disbursed','overdue') AND remaining_balance > 0),0),
         coalesce(sum(coalesce(disbursed_amount, loan_amount)) FILTER (WHERE admin_approved_at >= now() - interval '30 days' AND status NOT IN ('cancelled','rejected','pending')),0)
    INTO v_loan, v_recent
    FROM loans WHERE lower(employee_email) = lower(NEW.user_email);
  SELECT coalesce(sum(outstanding_balance),0) INTO v_od
    FROM overdraft_accounts WHERE outstanding_balance > 0
      AND (user_id = NEW.user_id OR lower(employee_email) = lower(NEW.user_email));

  IF v_loan > 0 OR v_recent > 0 OR v_od > 0 THEN
    v_msg := coalesce(NEW.employee_name, NEW.user_email) || ' started an investment of UGX ' || to_char(NEW.amount,'FM999,999,999')
      || ' while owing: loan UGX ' || to_char(v_loan,'FM999,999,990')
      || ', overdraft UGX ' || to_char(v_od,'FM999,999,990')
      || CASE WHEN v_recent > 0 THEN ', loan money received in the last 30 days UGX ' || to_char(v_recent,'FM999,999,990') ELSE '' END
      || '. Possible borrowing to invest. Please review.';
    INSERT INTO notifications (title, message, type, priority, target_user_id)
    SELECT DISTINCT 'Borrowed money invested?', v_msg, 'system_red_flag', 'high', ur.user_id
      FROM user_roles ur WHERE ur.role::text IN ('admin','super_admin','Administrator','Super Admin');
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW; -- an alert must never block the investment
END $$;

REVOKE ALL ON FUNCTION public.alert_borrow_to_invest() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_alert_borrow_to_invest ON public.investments;
CREATE TRIGGER trg_alert_borrow_to_invest AFTER INSERT ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.alert_borrow_to_invest();