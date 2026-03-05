-- Fix orphaned installments for completed/paid_off loans that still show as pending
UPDATE loan_repayments
SET status = 'paid',
    amount_paid = amount_due,
    paid_date = CURRENT_DATE
WHERE status IN ('pending', 'partial', 'overdue')
AND loan_id IN (
  SELECT id FROM loans WHERE status IN ('completed', 'paid_off')
);