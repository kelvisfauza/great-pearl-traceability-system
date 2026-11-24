-- lovable-cron-fallback-reviewed: bounded one-off resend queue paced under the 25/hour sending throttle; job unschedules itself once all 31 emails are delivered
UPDATE email_resend_private.queue q SET resent_at = NULL, request_id = NULL
WHERE q.resent_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.sent_emails_log l WHERE l.idempotency_key = 'resend-20261124-' || q.log_id);

CREATE OR REPLACE FUNCTION email_resend_private.send_batch(p_limit int DEFAULT 2)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; n int := 0;
BEGIN
  UPDATE email_resend_private.queue q SET resent_at = NULL, request_id = NULL
  WHERE q.resent_at < now() - interval '5 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.sent_emails_log l WHERE l.idempotency_key = 'resend-20261124-' || q.log_id);

  FOR r IN SELECT * FROM email_resend_private.queue WHERE resent_at IS NULL ORDER BY original_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
    UPDATE email_resend_private.queue SET resent_at = now(), request_id = net.http_post(
      url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object('Content-Type','application/json') || private_edge.header(),
      body := jsonb_build_object('templateName', r.template_name, 'recipientEmail', r.recipient_email,
        'templateData', r.template_data, 'skipSms', true, 'idempotencyKey', 'resend-20261124-' || r.log_id),
      timeout_milliseconds := 60000
    ) WHERE log_id = r.log_id;
    n := n + 1;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM email_resend_private.queue q WHERE NOT EXISTS (SELECT 1 FROM public.sent_emails_log l WHERE l.idempotency_key = 'resend-20261124-' || q.log_id)) THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'resend-20261124-emails';
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION email_resend_private.send_batch(int) FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('resend-20261124-emails');
SELECT cron.schedule('resend-20261124-emails', '*/10 * * * *', 'SELECT email_resend_private.send_batch(2)');
SELECT email_resend_private.send_batch(2);