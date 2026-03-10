
CREATE OR REPLACE FUNCTION public.process_money_request_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_user_balance numeric;
  user_identifier text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    user_identifier := NEW.user_id::text;

    IF NEW.request_type = 'withdrawal' THEN
      SELECT COALESCE(SUM(amount), 0) INTO current_user_balance
      FROM public.ledger_entries
      WHERE user_id = user_identifier;

      current_user_balance := current_user_balance - COALESCE(
        (SELECT SUM(amount) FROM public.money_requests
         WHERE user_id = NEW.user_id
         AND request_type = 'withdrawal'
         AND status IN ('approved', 'processing')
         AND id != NEW.id),
        0
      );

      IF current_user_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. User has % but withdrawal amount is %',
          current_user_balance, NEW.amount;
      END IF;

      NEW.wallet_balance_at_approval := current_user_balance;
      NEW.wallet_balance_verified := true;

      INSERT INTO public.ledger_entries (
        user_id, entry_type, amount, reference, metadata, created_at
      ) VALUES (
        user_identifier,
        'WITHDRAWAL',
        -NEW.amount,
        'WD-' || NEW.id::text,
        json_build_object(
          'request_id', NEW.id,
          'request_type', NEW.request_type,
          'approved_at', now()
        ),
        now()
      );

    ELSE
      INSERT INTO public.ledger_entries (
        user_id, entry_type, amount, reference, metadata, created_at
      ) VALUES (
        user_identifier,
        'DEPOSIT',
        NEW.amount,
        'MR-' || NEW.id::text,
        json_build_object(
          'request_id', NEW.id,
          'request_type', NEW.request_type,
          'approved_at', now()
        ),
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
