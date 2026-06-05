CREATE OR REPLACE FUNCTION public.notify_overdraft_recovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.transaction_type = 'recovery' AND COALESCE(NEW.amount, 0) > 0 THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/overdraft-recovery-notify',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
        body := jsonb_build_object('transaction_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'overdraft recovery notify failed for tx %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overdraft_recovery_notify ON public.overdraft_transactions;
CREATE TRIGGER trg_overdraft_recovery_notify
AFTER INSERT ON public.overdraft_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_overdraft_recovery();