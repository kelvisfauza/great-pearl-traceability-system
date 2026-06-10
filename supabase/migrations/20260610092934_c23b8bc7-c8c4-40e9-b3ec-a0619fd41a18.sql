CREATE TABLE IF NOT EXISTS public.birthday_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid,
  employee_email text NOT NULL,
  employee_name text NOT NULL,
  birthday_year integer NOT NULL,
  amount numeric NOT NULL DEFAULT 50000,
  ledger_reference text,
  sms_sent boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_email, birthday_year)
);

GRANT SELECT ON public.birthday_rewards TO authenticated;
GRANT ALL ON public.birthday_rewards TO service_role;

ALTER TABLE public.birthday_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view birthday rewards"
ON public.birthday_rewards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages birthday rewards"
ON public.birthday_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);