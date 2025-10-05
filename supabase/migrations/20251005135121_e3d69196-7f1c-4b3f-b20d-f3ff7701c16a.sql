-- Create finance_cash_balance table to track available cash
CREATE TABLE IF NOT EXISTS public.finance_cash_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finance_cash_transactions table to track all cash movements
CREATE TABLE IF NOT EXISTS public.finance_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'DEPOSIT', 'PAYMENT', 'ADJUSTMENT'
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_cash_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view finance_cash_balance"
  ON public.finance_cash_balance FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage finance_cash_balance"
  ON public.finance_cash_balance FOR ALL
  USING (is_current_user_admin());

CREATE POLICY "Anyone can view finance_cash_transactions"
  ON public.finance_cash_transactions FOR SELECT
  USING (true);

CREATE POLICY "Finance users can insert cash transactions"
  ON public.finance_cash_transactions FOR INSERT
  WITH CHECK (true);

-- Initialize with zero balance if not exists
INSERT INTO public.finance_cash_balance (current_balance, updated_by)
VALUES (0, 'System')
ON CONFLICT DO NOTHING;

-- Create function to update cash balance
CREATE OR REPLACE FUNCTION public.update_finance_cash_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_finance_cash_balance_timestamp
  BEFORE UPDATE ON public.finance_cash_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_cash_balance();