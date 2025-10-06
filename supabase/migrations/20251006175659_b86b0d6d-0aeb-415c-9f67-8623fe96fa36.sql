-- Mark all pending expense requests as approved or delete them
-- Option 1: Mark as approved (keeping history)
UPDATE approval_requests
SET 
  status = 'Approved',
  finance_approved_at = now(),
  finance_approved_by = 'System Migration',
  admin_approved_at = now(),
  admin_approved_by = 'System Migration'
WHERE 
  (type LIKE '%Expense%' OR type = 'Employee Expense Request')
  AND status = 'Pending';

-- Add EXPENSE transaction type support to finance_cash_transactions
-- This ensures expenses show up properly in day book and reports
COMMENT ON COLUMN finance_cash_transactions.transaction_type IS 
  'Transaction types: DEPOSIT, PAYMENT, ADVANCE_RECOVERY, EXPENSE';