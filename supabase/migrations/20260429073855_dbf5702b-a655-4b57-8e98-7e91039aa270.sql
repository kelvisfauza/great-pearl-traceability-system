
-- Add "Request Advance" as USSD service option 4
INSERT INTO public.ussd_services (service_key, name, description, display_order, is_active)
VALUES ('4', 'Request Advance', 'Customer requests a salary/cash advance via USSD. Creates an approval request; on approval, money is sent to caller phone.', 4, true)
ON CONFLICT DO NOTHING;

-- Tracking table for USSD-initiated advance requests
CREATE TABLE IF NOT EXISTS public.ussd_advance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  requester_name TEXT,
  employee_id UUID,
  approval_request_id UUID REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  disbursement_status TEXT NOT NULL DEFAULT 'pending',
  disbursement_attempted_at TIMESTAMPTZ,
  disbursement_completed_at TIMESTAMPTZ,
  disbursement_reference TEXT,
  disbursement_error TEXT,
  ussd_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ussd_advance_requests_status ON public.ussd_advance_requests(status, disbursement_status);
CREATE INDEX IF NOT EXISTS idx_ussd_advance_requests_approval ON public.ussd_advance_requests(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_ussd_advance_requests_phone ON public.ussd_advance_requests(phone);

ALTER TABLE public.ussd_advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ussd advance requests"
ON public.ussd_advance_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage ussd advance requests"
ON public.ussd_advance_requests FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_ussd_advance_requests_updated_at
BEFORE UPDATE ON public.ussd_advance_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
