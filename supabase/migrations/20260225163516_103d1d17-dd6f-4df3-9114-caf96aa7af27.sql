
CREATE TABLE public.mobile_money_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_ref TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  transaction_type TEXT NOT NULL DEFAULT 'deposit',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'gosentepay',
  provider_response JSONB,
  deposit_rate NUMERIC,
  withdrawal_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.mobile_money_transactions FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.mobile_money_transactions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Service role can update transactions"
ON public.mobile_money_transactions FOR UPDATE
USING (true);

CREATE INDEX idx_mmt_user_id ON public.mobile_money_transactions(user_id);
CREATE INDEX idx_mmt_transaction_ref ON public.mobile_money_transactions(transaction_ref);
CREATE INDEX idx_mmt_status ON public.mobile_money_transactions(status);

CREATE TRIGGER update_mobile_money_transactions_updated_at
BEFORE UPDATE ON public.mobile_money_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
