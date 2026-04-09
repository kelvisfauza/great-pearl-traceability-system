
-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT 'Unknown',
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 10,
  reduced_rate NUMERIC NOT NULL DEFAULT 3,
  maturity_months INTEGER NOT NULL DEFAULT 5,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  maturity_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  earned_interest NUMERIC NOT NULL DEFAULT 0,
  total_payout NUMERIC NOT NULL DEFAULT 0,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Users can view their own investments
CREATE POLICY "Users can view own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create investments for themselves
CREATE POLICY "Users can create own investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (for cron/maturity processing)
CREATE POLICY "Service role can update investments"
  ON public.investments FOR UPDATE
  USING (true);

-- Validate minimum investment amount
CREATE OR REPLACE FUNCTION public.validate_investment_minimum()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount < 100000 THEN
    RAISE EXCEPTION 'Minimum investment amount is 100,000 UGX';
  END IF;
  
  -- Auto-calculate maturity date
  NEW.maturity_date := NEW.start_date + (NEW.maturity_months || ' months')::interval;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_investment_before_insert
  BEFORE INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_investment_minimum();

-- Update timestamp trigger
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
