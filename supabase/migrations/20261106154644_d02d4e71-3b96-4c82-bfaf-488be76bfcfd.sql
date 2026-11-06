CREATE TABLE public.agent_payment_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number text NOT NULL UNIQUE,
  issued_by uuid NOT NULL DEFAULT auth.uid(),
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE public.agent_payment_slip_seq;
GRANT SELECT ON public.agent_payment_slips TO authenticated;
GRANT ALL ON public.agent_payment_slips TO service_role;
ALTER TABLE public.agent_payment_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff view slips" ON public.agent_payment_slips FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.issue_agent_payment_slips(p_count int)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text[] := '{}'; n text; i int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF p_count < 1 OR p_count > 200 THEN RAISE EXCEPTION 'Count must be 1-200'; END IF;
  FOR i IN 1..p_count LOOP
    n := 'AGT-' || to_char(now() AT TIME ZONE 'Africa/Kampala','YYYY') || '-' || lpad(nextval('public.agent_payment_slip_seq')::text, 6, '0');
    INSERT INTO public.agent_payment_slips(slip_number, issued_by) VALUES (n, auth.uid());
    r := r || n;
  END LOOP;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.issue_agent_payment_slips(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_agent_payment_slips(int) TO authenticated, service_role;