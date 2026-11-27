CREATE OR REPLACE FUNCTION public.wake_withdrawal_auto_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'Withdrawal Request' AND NEW.status = 'Pending Admin'
     AND coalesce(NEW.details->>'request_type','') = 'withdrawal'
     AND (coalesce(NEW.disbursement_method,'') = 'mobile_money' OR upper(coalesce(NEW.details->>'payment_channel','')) = 'MOBILE_MONEY')
     AND coalesce(NEW.amount,0) <= 500000 THEN
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
REVOKE EXECUTE ON FUNCTION public.wake_withdrawal_auto_review() FROM PUBLIC, anon, authenticated;