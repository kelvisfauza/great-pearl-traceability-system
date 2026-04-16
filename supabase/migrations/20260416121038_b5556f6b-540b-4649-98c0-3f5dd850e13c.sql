-- Fix installment 2 of loan fc46f1a6: status should be 'partial' since 60,000 of 82,500 has been paid
UPDATE loan_repayments 
SET status = 'partial', paid_date = '2026-04-09'
WHERE id = 'be870303-44f1-4c51-9c7c-0575233e8a09' 
AND amount_paid = 60000 AND status = 'pending';