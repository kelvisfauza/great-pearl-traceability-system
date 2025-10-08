
-- Delete the 3 duplicate payment records (keeping only the first one)
DELETE FROM payment_records 
WHERE id IN (
  'f6b01724-1b4c-4d2c-93cc-d034bef522f2',
  '302133b2-c765-4e12-9951-adb97c199af7',
  '9cec243a-ace5-4791-85b2-d317c1a1f588'
);

-- Insert the correct cash transaction for the single payment (105,000)
INSERT INTO finance_cash_transactions (
  transaction_type,
  amount,
  balance_after,
  reference,
  notes,
  created_by,
  status,
  confirmed_by,
  confirmed_at
) VALUES (
  'PAYMENT',
  -105000,
  673945000, -- 674,050,000 - 105,000
  'BATCH1759757221817',
  'Payment to Apuli - BATCH1759757221817',
  'Finance',
  'confirmed',
  'Finance',
  NOW()
);

-- Update the cash balance to reflect the payment
UPDATE finance_cash_balance
SET 
  current_balance = 673945000,
  last_updated = NOW(),
  updated_by = 'Finance'
WHERE id = 'a5e1aa19-a908-4200-ac28-16cf02cf750e';

-- Add the missing transaction record to daily_tasks for the day book
INSERT INTO daily_tasks (
  task_type,
  description,
  amount,
  batch_number,
  completed_by,
  department,
  date
) VALUES (
  'coffee_payment',
  'Coffee payment to Apuli - Batch BATCH1759757221817',
  105000,
  'BATCH1759757221817',
  'Finance',
  'Finance',
  '2025-10-08'
);
