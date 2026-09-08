CREATE OR REPLACE FUNCTION public.notify_procurement_review_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.type, '')) = 'leave' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/procurement-review-notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "scan"}'::jsonb
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_procurement_review ON public.approval_requests;

CREATE TRIGGER trg_notify_procurement_review
AFTER INSERT ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_procurement_review_on_new_request();