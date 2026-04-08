
-- Admin-initiated withdrawals table
CREATE TABLE public.admin_initiated_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  pin_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_pin',
  initiated_by TEXT NOT NULL,
  initiated_by_name TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  ledger_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_initiated_withdrawals ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on admin_initiated_withdrawals"
  ON public.admin_initiated_withdrawals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Users can view their own pending withdrawals (for real-time prompt)
CREATE POLICY "Users can view own admin_initiated_withdrawals"
  ON public.admin_initiated_withdrawals
  FOR SELECT
  TO authenticated
  USING (employee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE admin_initiated_withdrawals;
