-- Create finance advances tracking table
CREATE TABLE IF NOT EXISTS public.finance_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cleared_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'cleared'))
);

-- Enable RLS
ALTER TABLE public.finance_advances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Finance users can manage advances"
ON public.finance_advances
FOR ALL
USING (true);

-- Reset finance cash balance to zero by inserting adjustment transaction
DO $$
DECLARE
  current_cash_in NUMERIC;
  current_cash_out NUMERIC;
  adjustment_amount NUMERIC;
BEGIN
  -- Calculate total cash in
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO current_cash_in
  FROM finance_cash_transactions
  WHERE transaction_type IN ('DEPOSIT', 'ADVANCE_RECOVERY')
  AND status = 'confirmed';
  
  -- Calculate total cash out
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO current_cash_out
  FROM finance_cash_transactions
  WHERE transaction_type IN ('PAYMENT', 'EXPENSE')
  AND status = 'confirmed';
  
  -- Calculate adjustment needed to zero out
  adjustment_amount := current_cash_in - current_cash_out;
  
  -- If there's a positive balance, record it as cash out to zero it
  IF adjustment_amount > 0 THEN
    INSERT INTO finance_cash_transactions (
      amount,
      transaction_type,
      reference,
      balance_after,
      created_by,
      status,
      confirmed_at,
      confirmed_by
    ) VALUES (
      -adjustment_amount,
      'PAYMENT',
      'Cash balance reset - system adjustment to enable advance tracking',
      0,
      'System',
      'confirmed',
      now(),
      'System'
    );
  END IF;
END $$;