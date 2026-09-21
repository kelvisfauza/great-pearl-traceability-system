
CREATE OR REPLACE FUNCTION public.is_quotation_approver()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND COALESCE(e.disabled,false) = false
      AND e.role = ANY (ARRAY['Super Admin','Administrator','Managing Director'])
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND COALESCE(e.disabled,false) = false
  );
$$;

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  subject text NOT NULL,
  amount numeric,
  currency text NOT NULL DEFAULT 'UGX',
  notes text,
  file_path text,
  file_name text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_by text,
  submitted_by_email text,
  procurement_decision text,
  procurement_notes text,
  procurement_by text,
  procurement_at timestamptz,
  approval_decision text,
  approval_notes text,
  approval_by text,
  approval_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  channel text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  subject text,
  body text NOT NULL,
  recipient text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotation_messages_q ON public.quotation_messages(quotation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
GRANT SELECT, INSERT ON public.quotation_messages TO authenticated;
GRANT ALL ON public.quotation_messages TO service_role;

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view quotations" ON public.quotations
  FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff can add quotations" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());
CREATE POLICY "Procurement and admins can update quotations" ON public.quotations
  FOR UPDATE TO authenticated
  USING (public.is_procurement_reviewer(auth.uid()) OR public.is_quotation_approver())
  WITH CHECK (public.is_procurement_reviewer(auth.uid()) OR public.is_quotation_approver());
CREATE POLICY "Service role manages quotations" ON public.quotations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view quotation messages" ON public.quotation_messages
  FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff can log quotation messages" ON public.quotation_messages
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());
CREATE POLICY "Service role manages quotation messages" ON public.quotation_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
