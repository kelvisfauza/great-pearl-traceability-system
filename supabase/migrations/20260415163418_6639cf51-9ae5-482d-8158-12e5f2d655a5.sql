
CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  alternative_phone TEXT,
  email TEXT,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service providers"
ON public.service_providers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert service providers"
ON public.service_providers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update service providers"
ON public.service_providers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete service providers"
ON public.service_providers FOR DELETE TO authenticated USING (true);
