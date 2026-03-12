UPDATE loans 
SET total_weeks = NULL, weekly_installment = NULL 
WHERE repayment_frequency IN ('monthly', 'bullet') AND (total_weeks IS NOT NULL OR weekly_installment IS NOT NULL);