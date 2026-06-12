
DROP TABLE IF EXISTS public.loan_appeal_votes CASCADE;
DROP TABLE IF EXISTS public.loan_appeals CASCADE;
DROP FUNCTION IF EXISTS public.tally_loan_appeal_votes() CASCADE;
DROP FUNCTION IF EXISTS public.touch_loan_appeals_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_loan_appeal_admin(uuid) CASCADE;

CREATE TABLE public.loan_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_evaluation_id UUID REFERENCES public.loan_evaluations(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  requested_amount NUMERIC NOT NULL,
  offered_amount NUMERIC NOT NULL DEFAULT 0,
  loan_type TEXT NOT NULL,
  requested_term_months INTEGER NOT NULL,
  justification TEXT NOT NULL,
  evaluation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_admin_review',
  final_amount NUMERIC,
  final_term_months INTEGER,
  final_decision TEXT,
  decided_at TIMESTAMPTZ,
  resulting_loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.loan_appeals TO authenticated;
GRANT ALL ON public.loan_appeals TO service_role;
ALTER TABLE public.loan_appeals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_loan_appeal_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text IN ('Administrator','Super Admin')
  );
$$;

CREATE POLICY "Users can view own appeals" ON public.loan_appeals FOR SELECT TO authenticated
USING (user_id = auth.uid()::text OR public.is_loan_appeal_admin(auth.uid()));

CREATE POLICY "Users can create own appeals" ON public.loan_appeals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Admins can update appeals" ON public.loan_appeals FOR UPDATE TO authenticated
USING (public.is_loan_appeal_admin(auth.uid()));

CREATE TABLE public.loan_appeal_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.loan_appeals(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  admin_email TEXT,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('uphold','approve_full','counter')),
  counter_amount NUMERIC,
  counter_term_months INTEGER,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appeal_id, admin_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_appeal_votes TO authenticated;
GRANT ALL ON public.loan_appeal_votes TO service_role;
ALTER TABLE public.loan_appeal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owner view votes" ON public.loan_appeal_votes FOR SELECT TO authenticated
USING (
  public.is_loan_appeal_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.loan_appeals la WHERE la.id = appeal_id AND la.user_id = auth.uid()::text)
);

CREATE POLICY "Admins can vote" ON public.loan_appeal_votes FOR INSERT TO authenticated
WITH CHECK (
  public.is_loan_appeal_admin(auth.uid()) AND admin_id = auth.uid()
  AND NOT EXISTS (SELECT 1 FROM public.loan_appeals la WHERE la.id = appeal_id AND la.user_id = auth.uid()::text)
);

CREATE POLICY "Admins update own vote" ON public.loan_appeal_votes FOR UPDATE TO authenticated
USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_loan_appeals_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_loan_appeals_updated_at
BEFORE UPDATE ON public.loan_appeals
FOR EACH ROW EXECUTE FUNCTION public.touch_loan_appeals_updated_at();

CREATE OR REPLACE FUNCTION public.tally_loan_appeal_votes()
RETURNS TRIGGER AS $$
DECLARE
  v_appeal public.loan_appeals%ROWTYPE;
  v_count INT;
  v_counter_amount NUMERIC;
  v_counter_term INT;
BEGIN
  SELECT * INTO v_appeal FROM public.loan_appeals WHERE id = NEW.appeal_id;
  IF v_appeal.status <> 'pending_admin_review' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count FROM public.loan_appeal_votes WHERE appeal_id = NEW.appeal_id AND vote_type='uphold';
  IF v_count >= 3 THEN
    UPDATE public.loan_appeals SET status='decided_uphold', final_decision='uphold',
      final_amount=offered_amount, decided_at=now() WHERE id=NEW.appeal_id;
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.loan_appeal_votes WHERE appeal_id = NEW.appeal_id AND vote_type='approve_full';
  IF v_count >= 3 THEN
    UPDATE public.loan_appeals SET status='decided_approve', final_decision='approve_full',
      final_amount=requested_amount, final_term_months=requested_term_months, decided_at=now()
    WHERE id=NEW.appeal_id;
    RETURN NEW;
  END IF;

  SELECT counter_amount, counter_term_months, COUNT(*)::int
  INTO v_counter_amount, v_counter_term, v_count
  FROM public.loan_appeal_votes
  WHERE appeal_id = NEW.appeal_id AND vote_type='counter'
  GROUP BY counter_amount, counter_term_months
  ORDER BY COUNT(*) DESC LIMIT 1;

  IF v_count >= 3 THEN
    UPDATE public.loan_appeals SET status='decided_counter', final_decision='counter',
      final_amount=v_counter_amount, final_term_months=v_counter_term, decided_at=now()
    WHERE id=NEW.appeal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_tally_loan_appeal_votes
AFTER INSERT OR UPDATE ON public.loan_appeal_votes
FOR EACH ROW EXECUTE FUNCTION public.tally_loan_appeal_votes();

CREATE INDEX idx_loan_appeals_status ON public.loan_appeals(status);
CREATE INDEX idx_loan_appeals_user ON public.loan_appeals(user_id);
CREATE INDEX idx_loan_appeal_votes_appeal ON public.loan_appeal_votes(appeal_id);
