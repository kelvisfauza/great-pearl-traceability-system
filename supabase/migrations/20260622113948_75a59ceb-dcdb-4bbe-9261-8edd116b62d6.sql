
-- 1. Support staff per-diem table
CREATE TABLE IF NOT EXISTS public.support_staff_per_diem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  national_id TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  withdraw_charge NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'mobile_money', -- 'mobile_money' | 'cash'
  yo_reference TEXT,
  yo_status TEXT NOT NULL DEFAULT 'pending',
  yo_raw_response TEXT,
  initiated_by TEXT NOT NULL,
  initiated_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_staff_per_diem TO authenticated;
GRANT ALL ON public.support_staff_per_diem TO service_role;

ALTER TABLE public.support_staff_per_diem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view support staff per-diem"
  ON public.support_staff_per_diem FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert support staff per-diem"
  ON public.support_staff_per_diem FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update support staff per-diem"
  ON public.support_staff_per_diem FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_support_staff_perdiem_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_support_staff_perdiem_updated_at ON public.support_staff_per_diem;
CREATE TRIGGER trg_support_staff_perdiem_updated_at
  BEFORE UPDATE ON public.support_staff_per_diem
  FOR EACH ROW EXECUTE FUNCTION public.update_support_staff_perdiem_updated_at();

-- 2. Extend provider_submission_requests for support staff self-submit
ALTER TABLE public.provider_submission_requests
  ADD COLUMN IF NOT EXISTS national_id TEXT;
