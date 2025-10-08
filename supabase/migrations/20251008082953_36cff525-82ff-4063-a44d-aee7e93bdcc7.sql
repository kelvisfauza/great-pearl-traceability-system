-- Insert missing cash transaction for the payment that was made
-- Payment: Simiyoni, Batch BATCH1759739907765, Amount: 7,421,000
INSERT INTO finance_cash_transactions (
  transaction_type,
  amount,
  balance_after,
  reference,
  notes,
  created_by,
  status,
  confirmed_by,
  confirmed_at,
  created_at
)
SELECT 
  'PAYMENT',
  -7421000,
  681471000 - 7421000, -- Available cash before payment minus payment amount
  'BATCH1759739907765',
  'Payment to Simiyoni - BATCH1759739907765',
  'Finance',
  'confirmed',
  'Finance',
  '2025-10-08T08:15:50.716641+00:00',
  '2025-10-08T08:15:50.716641+00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM finance_cash_transactions 
  WHERE reference = 'BATCH1759739907765' 
  AND transaction_type = 'PAYMENT'
);

-- Update or create the finance_cash_balance record with correct balance
INSERT INTO finance_cash_balance (current_balance, updated_by, last_updated)
VALUES (674050000, 'Finance', NOW())
ON CONFLICT (id) DO UPDATE
SET 
  current_balance = 674050000,
  updated_by = 'Finance',
  last_updated = NOW();