-- Add status and confirmation fields to finance_cash_transactions
ALTER TABLE finance_cash_transactions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmed_by TEXT,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for status
ALTER TABLE finance_cash_transactions 
ADD CONSTRAINT finance_cash_transactions_status_check 
CHECK (status IN ('pending', 'confirmed'));

-- Update existing transactions to confirmed
UPDATE finance_cash_transactions 
SET status = 'confirmed', confirmed_at = created_at 
WHERE status = 'pending';