CREATE OR REPLACE FUNCTION public.process_monthly_payroll(p_month text DEFAULT to_char(now(),'YYYY-MM'))
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp RECORD;
  adv RECORD;
  v_uid text;
  v_remaining numeric;
  v_recover numeric;
  v_total_advances numeric;
  v_payment_id uuid;
  v_processed int := 0;
  v_skipped int := 0;
  v_total_gross numeric := 0;
  v_total_recovered numeric := 0;
BEGIN
  FOR emp IN
    SELECT id, auth_user_id, name, email, salary
    FROM public.employees
    WHERE coalesce(disabled,false) = false
      AND coalesce(status,'Active') = 'Active'
      AND coalesce(salary,0) > 0
      AND auth_user_id IS NOT NULL
  LOOP
    v_uid := emp.auth_user_id::text;

    IF EXISTS (
      SELECT 1 FROM public.ledger_entries
      WHERE user_id = v_uid
        AND entry_type = 'MONTHLY_SALARY'
        AND metadata->>'payment_month' = p_month
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT coalesce(sum(remaining_balance),0) INTO v_total_advances
    FROM public.employee_salary_advances
    WHERE employee_email = emp.email AND coalesce(remaining_balance,0) > 0;

    INSERT INTO public.employee_salary_payments(
      employee_id, employee_name, employee_email,
      salary_amount, gross_salary, advance_deduction, net_salary,
      payment_month, payment_method, status,
      processed_by, processed_by_email, completed_at, completed_by,
      payment_label
    ) VALUES (
      emp.id::text, emp.name, emp.email,
      emp.salary, emp.salary, least(v_total_advances, emp.salary), greatest(emp.salary - v_total_advances, 0),
      p_month, 'Wallet', 'completed',
      'system_cron', 'system@greatpearlcoffee.com', now(), 'system_cron',
      'Monthly Salary ' || p_month
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.ledger_entries(user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_uid, 'MONTHLY_SALARY', emp.salary,
      'SAL-' || p_month || '-' || emp.id,
      'salary',
      jsonb_build_object(
        'description', 'Monthly salary ' || p_month,
        'payment_month', p_month,
        'employee_id', emp.id,
        'employee_name', emp.name,
        'payment_id', v_payment_id
      )
    );
    v_total_gross := v_total_gross + emp.salary;

    FOR adv IN
      SELECT id, remaining_balance, original_amount, reason
      FROM public.employee_salary_advances
      WHERE employee_email = emp.email AND coalesce(remaining_balance,0) > 0
      ORDER BY created_at ASC
    LOOP
      EXIT WHEN v_total_advances <= 0;
      v_remaining := adv.remaining_balance;
      v_recover := least(v_remaining, emp.salary);
      IF v_recover <= 0 THEN CONTINUE; END IF;

      INSERT INTO public.ledger_entries(user_id, entry_type, amount, reference, source_category, metadata)
      VALUES (
        v_uid, 'ADVANCE_RECOVERY', -v_recover,
        'ADVREC-' || p_month || '-' || adv.id,
        'advance_recovery',
        jsonb_build_object(
          'description', 'Salary advance recovery (' || coalesce(adv.reason,'advance') || ')',
          'payment_month', p_month,
          'advance_id', adv.id,
          'salary_payment_id', v_payment_id
        )
      );

      UPDATE public.employee_salary_advances
      SET remaining_balance = remaining_balance - v_recover,
          status = CASE WHEN remaining_balance - v_recover <= 0 THEN 'cleared' ELSE coalesce(status,'active') END,
          updated_at = now()
      WHERE id = adv.id;

      INSERT INTO public.advance_recoveries(payment_id, advance_id, recovered_ugx)
      VALUES (v_payment_id, adv.id, v_recover);

      INSERT INTO public.salary_advance_payments(advance_id, employee_email, amount_paid, salary_request_id, approved_by, status)
      VALUES (adv.id, emp.email, v_recover, v_payment_id::text, 'system_cron', 'completed');

      v_total_recovered := v_total_recovered + v_recover;
      v_total_advances := v_total_advances - v_recover;
    END LOOP;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN json_build_object(
    'ok', true, 'month', p_month, 'processed', v_processed,
    'skipped_already_paid', v_skipped,
    'total_gross_credited', v_total_gross,
    'total_advances_recovered', v_total_recovered
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'error', SQLERRM, 'processed', v_processed);
END;
$$;