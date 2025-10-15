-- Sync finance_cash_balance with actual transaction totals
UPDATE finance_cash_balance 
SET current_balance = 512913128,
    updated_by = 'System Sync - Corrected Balance',
    last_updated = NOW()
WHERE id = 'a5e1aa19-a908-4200-ac28-16cf02cf750e';