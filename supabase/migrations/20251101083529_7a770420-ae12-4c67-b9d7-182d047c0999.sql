-- Create archive tables for historical data
CREATE TABLE IF NOT EXISTS public.archived_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  requestedby TEXT NOT NULL,
  daterequested DATE NOT NULL,
  priority TEXT,
  status TEXT NOT NULL,
  details JSONB,
  finance_approved BOOLEAN DEFAULT FALSE,
  admin_approved BOOLEAN DEFAULT FALSE,
  finance_approved_at TIMESTAMPTZ,
  admin_approved_at TIMESTAMPTZ,
  finance_approved_by TEXT,
  admin_approved_by TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT,
  archive_period TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.archived_finance_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  reference TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT,
  archive_period TEXT NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.archived_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  supplier_name TEXT,
  amount NUMERIC NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  recorded_by TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT,
  archive_period TEXT NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.archived_money_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  employee_id TEXT,
  employee_name TEXT,
  request_type TEXT,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT,
  archive_period TEXT NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.archive_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_period TEXT NOT NULL,
  archive_date TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT NOT NULL,
  records_archived JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on archive tables
ALTER TABLE public.archived_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_finance_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_money_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_history ENABLE ROW LEVEL SECURITY;

-- Create policies for archive tables (admin and finance can view)
CREATE POLICY "Admins can view archived approval requests" ON public.archived_approval_requests FOR SELECT USING (true);
CREATE POLICY "Admins can insert archived approval requests" ON public.archived_approval_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view archived cash transactions" ON public.archived_finance_cash_transactions FOR SELECT USING (true);
CREATE POLICY "Admins can insert archived cash transactions" ON public.archived_finance_cash_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view archived payment records" ON public.archived_payment_records FOR SELECT USING (true);
CREATE POLICY "Admins can insert archived payment records" ON public.archived_payment_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view archived money requests" ON public.archived_money_requests FOR SELECT USING (true);
CREATE POLICY "Admins can insert archived money requests" ON public.archived_money_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view archive history" ON public.archive_history FOR SELECT USING (true);
CREATE POLICY "Admins can insert archive history" ON public.archive_history FOR INSERT WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_archived_approval_requests_period ON public.archived_approval_requests(archive_period);
CREATE INDEX idx_archived_approval_requests_date ON public.archived_approval_requests(daterequested);
CREATE INDEX idx_archived_cash_transactions_period ON public.archived_finance_cash_transactions(archive_period);
CREATE INDEX idx_archived_payment_records_period ON public.archived_payment_records(archive_period);
CREATE INDEX idx_archived_money_requests_period ON public.archived_money_requests(archive_period);
CREATE INDEX idx_archive_history_period ON public.archive_history(archive_period);