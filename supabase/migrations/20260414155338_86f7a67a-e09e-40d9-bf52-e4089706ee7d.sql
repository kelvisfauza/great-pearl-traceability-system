
CREATE TABLE public.service_provider_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_phone TEXT NOT NULL,
  receiver_name TEXT,
  service_description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  withdraw_charge NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  yo_reference TEXT,
  yo_status TEXT NOT NULL DEFAULT 'pending',
  yo_raw_response TEXT,
  initiated_by TEXT NOT NULL,
  initiated_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_provider_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service provider payments"
  ON public.service_provider_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service provider payments"
  ON public.service_provider_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update service provider payments"
  ON public.service_provider_payments FOR UPDATE
  USING (true);
