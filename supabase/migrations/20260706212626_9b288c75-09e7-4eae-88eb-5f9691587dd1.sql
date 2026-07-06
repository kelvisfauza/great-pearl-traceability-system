
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'web_form',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.support_ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_user_id UUID,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_email ON public.support_tickets(customer_email);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_ticket_replies_ticket ON public.support_ticket_replies(ticket_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_replies TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.support_ticket_replies TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view tickets"
  ON public.support_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated staff can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated staff can insert tickets"
  ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE POLICY "Authenticated staff can view replies"
  ON public.support_ticket_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated staff can insert replies"
  ON public.support_ticket_replies FOR INSERT TO authenticated
  WITH CHECK (author_type IN ('admin','system'));

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_support_ticket_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    code := 'TKT-' || to_char(now(), 'YYMMDD') || '-' ||
            upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_code = code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique ticket code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;
