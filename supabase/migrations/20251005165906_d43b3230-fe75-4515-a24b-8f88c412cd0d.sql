-- Correct the finance cash balance based on all confirmed transactions
UPDATE finance_cash_balance 
SET current_balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM finance_cash_transactions 
  WHERE status = 'confirmed'
),
updated_by = 'System Correction',
last_updated = now()
WHERE id = (
  SELECT id FROM finance_cash_balance 
  ORDER BY last_updated DESC 
  LIMIT 1
);