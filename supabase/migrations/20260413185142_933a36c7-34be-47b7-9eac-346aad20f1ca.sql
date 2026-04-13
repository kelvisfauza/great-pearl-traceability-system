
CREATE TABLE public.location_tracking_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_name TEXT,
  employee_email TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_address TEXT,
  ip_address TEXT,
  device_model TEXT,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.location_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own location logs"
ON public.location_tracking_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all location logs"
ON public.location_tracking_logs
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_location_logs_user_date ON public.location_tracking_logs (user_id, tracking_date);
CREATE INDEX idx_location_logs_date ON public.location_tracking_logs (tracking_date);
