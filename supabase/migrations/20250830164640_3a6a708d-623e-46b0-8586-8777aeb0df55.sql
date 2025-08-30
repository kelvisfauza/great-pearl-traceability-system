-- Create ledger_entries table for proper accounting
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL, -- 'EARNING', 'WITHDRAWAL', 'PROVIDER_FEE', 'ADJUSTMENT'
  amount NUMERIC NOT NULL, -- positive for credits, negative for debits
  reference TEXT NOT NULL, -- reference to original transaction
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ledger entries" 
ON public.ledger_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert ledger entries" 
ON public.ledger_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all ledger entries" 
ON public.ledger_entries 
FOR SELECT 
USING (is_current_user_admin());

-- Add index for better performance
CREATE INDEX idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX idx_ledger_entries_type ON public.ledger_entries(entry_type);

-- Add updated_at trigger
CREATE TRIGGER update_ledger_entries_updated_at
BEFORE UPDATE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update withdrawal_requests table to include new fields
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS request_ref TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS provider_ref TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS provider_fee NUMERIC DEFAULT 0;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS payment_voucher TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'ZENGAPAY';

-- Create function to calculate wallet balance from ledger
CREATE OR REPLACE FUNCTION public.get_wallet_balance(user_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to calculate pending withdrawals
CREATE OR REPLACE FUNCTION public.get_pending_withdrawals(user_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to calculate available to request
CREATE OR REPLACE FUNCTION public.get_available_to_request(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;