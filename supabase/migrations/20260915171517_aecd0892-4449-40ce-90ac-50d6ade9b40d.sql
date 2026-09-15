CREATE TABLE public.broadcast_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  message TEXT NOT NULL,
  sms_recipients INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  sms_failed INTEGER NOT NULL DEFAULT 0,
  email_recipients INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending',
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.broadcast_communications TO authenticated;
GRANT ALL ON public.broadcast_communications TO service_role;

ALTER TABLE public.broadcast_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcasts"
ON public.broadcast_communications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(auth.jwt() ->> 'email')
      AND e.role IN ('Administrator', 'Super Admin', 'Managing Director')
  )
);

CREATE TRIGGER update_broadcast_communications_updated_at
BEFORE UPDATE ON public.broadcast_communications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();