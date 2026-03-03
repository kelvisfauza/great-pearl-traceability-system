CREATE TABLE public.gosentepay_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance numeric NOT NULL DEFAULT 0,
  last_updated_by text,
  last_transaction_ref text,
  last_transaction_type text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gosentepay_balance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read balance"
  ON public.gosentepay_balance FOR SELECT
  TO authenticated USING (true);

-- Allow authenticated users to insert/update (admin check done in app)
CREATE POLICY "Authenticated users can manage balance"
  ON public.gosentepay_balance FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Insert initial balance
INSERT INTO public.gosentepay_balance (balance, last_updated_by, notes)
VALUES (589860, 'system', 'Initial balance setup');

-- Create a log table for balance changes
CREATE TABLE public.gosentepay_balance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_balance numeric NOT NULL,
  new_balance numeric NOT NULL,
  change_amount numeric NOT NULL,
  change_type text NOT NULL, -- 'payout_deduction', 'deposit', 'manual_adjustment'
  reference text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gosentepay_balance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read balance log"
  ON public.gosentepay_balance_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert balance log"
  ON public.gosentepay_balance_log FOR INSERT
  TO authenticated WITH CHECK (true);