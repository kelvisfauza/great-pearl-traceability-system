
CREATE TABLE IF NOT EXISTS sent_emails_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  status text DEFAULT 'sent',
  error_message text,
  idempotency_key text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sent_emails_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IT admins can view sent emails"
  ON sent_emails_log FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_sent_emails_created ON sent_emails_log (created_at DESC);
CREATE INDEX idx_sent_emails_template ON sent_emails_log (template_name);
CREATE INDEX idx_sent_emails_recipient ON sent_emails_log (recipient_email);
