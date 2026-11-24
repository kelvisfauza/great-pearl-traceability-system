CREATE SCHEMA IF NOT EXISTS email_resend_private;
REVOKE ALL ON SCHEMA email_resend_private FROM PUBLIC, anon, authenticated;

CREATE TABLE email_resend_private.queue (
  log_id uuid PRIMARY KEY,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  template_data jsonb NOT NULL,
  original_at timestamptz NOT NULL,
  resent_at timestamptz,
  request_id bigint
);
GRANT ALL ON email_resend_private.queue TO service_role;

INSERT INTO email_resend_private.queue (log_id, template_name, recipient_email, template_data, original_at)
SELECT DISTINCT ON (lower(recipient_email), subject) id, template_name, recipient_email,
       COALESCE(metadata, '{}'::jsonb) - 'sms_status', created_at
FROM public.sent_emails_log
WHERE created_at >= timestamptz '2026-11-24 00:00:00+03'
  AND created_at < now()
  AND template_name IN ('general-notification','payment-receipt','loan-guarantor-response','approval-action')
  AND lower(recipient_email) <> 'operations@greatpearlcoffee.com'
ORDER BY lower(recipient_email), subject, created_at;

CREATE OR REPLACE FUNCTION email_resend_private.send_batch(p_limit int DEFAULT 10)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT * FROM email_resend_private.queue WHERE resent_at IS NULL ORDER BY original_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
    UPDATE email_resend_private.queue SET resent_at = now(), request_id = net.http_post(
      url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object('Content-Type','application/json') || private_edge.header(),
      body := jsonb_build_object('templateName', r.template_name, 'recipientEmail', r.recipient_email,
        'templateData', r.template_data, 'skipSms', true, 'idempotencyKey', 'resend-20261124-' || r.log_id)
    ) WHERE log_id = r.log_id;
    n := n + 1;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM email_resend_private.queue WHERE resent_at IS NULL) THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'resend-20261124-emails';
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION email_resend_private.send_batch(int) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('resend-20261124-emails', '5 * * * *', 'SELECT email_resend_private.send_batch(10)');
SELECT email_resend_private.send_batch(10);