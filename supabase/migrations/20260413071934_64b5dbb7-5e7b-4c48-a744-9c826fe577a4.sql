CREATE TABLE public.ussd_payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  phone TEXT,
  amount NUMERIC DEFAULT 0,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  narrative TEXT,
  raw_payload TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ussd_payment_logs_reference ON public.ussd_payment_logs(reference);
CREATE INDEX idx_ussd_payment_logs_status ON public.ussd_payment_logs(status);

ALTER TABLE public.ussd_payment_logs ENABLE ROW LEVEL SECURITY;

-- Allow external IPN calls to insert (no auth)
CREATE POLICY "Allow public insert for IPN callbacks"
ON public.ussd_payment_logs
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can read
CREATE POLICY "Authenticated users can read logs"
ON public.ussd_payment_logs
FOR SELECT
TO authenticated
USING (true);