
CREATE TABLE public.provider_submission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('service_provider','meal_plan')),
  provider_name text NOT NULL,
  phone text NOT NULL,
  email text,
  amount numeric NOT NULL CHECK (amount >= 500),
  description text NOT NULL,
  invoice_number text,
  attachment_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','failed')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  payout_record_id uuid,
  payout_status text,
  payout_message text,
  submitter_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.provider_submission_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_submission_requests TO authenticated;
GRANT ALL ON public.provider_submission_requests TO service_role;

ALTER TABLE public.provider_submission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a provider request"
  ON public.provider_submission_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and finance can view submissions"
  ON public.provider_submission_requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

CREATE POLICY "Admins and finance can update submissions"
  ON public.provider_submission_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  );

CREATE TRIGGER update_provider_submission_requests_updated_at
  BEFORE UPDATE ON public.provider_submission_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_provider_submission_requests_status
  ON public.provider_submission_requests(status, created_at DESC);
