CREATE OR REPLACE FUNCTION public.update_advance_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trusted text;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- If the trusted wallet repayment RPC already updated the advance balance,
  -- do not apply the same payment a second time through this history trigger.
  BEGIN
    v_trusted := current_setting('app.trusted_advance_repay', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;

  IF v_trusted IS NOT NULL AND v_trusted = NEW.advance_id::text THEN
    RETURN NEW;
  END IF;

  UPDATE public.employee_salary_advances
     SET remaining_balance = GREATEST(0, COALESCE(remaining_balance, 0) - COALESCE(NEW.amount_paid, 0)),
         updated_at = now(),
         status = CASE
           WHEN GREATEST(0, COALESCE(remaining_balance, 0) - COALESCE(NEW.amount_paid, 0)) <= 0 THEN 'cleared'
           ELSE 'active'
         END
   WHERE id = NEW.advance_id;

  RETURN NEW;
END;
$function$;