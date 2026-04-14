
CREATE TABLE public.meal_disbursements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_phone TEXT NOT NULL,
  receiver_name TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  withdraw_charge NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  yo_reference TEXT,
  yo_status TEXT NOT NULL DEFAULT 'pending',
  yo_raw_response TEXT,
  initiated_by TEXT NOT NULL,
  initiated_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meal disbursements"
  ON public.meal_disbursements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert meal disbursements"
  ON public.meal_disbursements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update meal disbursements"
  ON public.meal_disbursements FOR UPDATE TO authenticated USING (true);
