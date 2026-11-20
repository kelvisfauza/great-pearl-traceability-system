INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT '7cdf79bf-c024-4107-98a7-3d84dbf0e975','LOAN_REPAYMENT',-50800,'LOAN-MOMO-REPAY-ebb039ec-0f3f-4fb0-a9b6-29237a44ef32-FIX20261120','LOAN_REPAYMENT',
 jsonb_build_object('description','Applied to Loan ebb039ec via MoMo (missing debit corrected)','loan_id','ebb039ec-0f3f-4fb0-a9b6-29237a44ef32','method','mobile_money','pair','loan_repayment_out','bypass_treasury_check',true,'bypass_treasury_accounts',true)
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference='LOAN-MOMO-REPAY-ebb039ec-0f3f-4fb0-a9b6-29237a44ef32-FIX20261120');

UPDATE public.employee_salary_advances SET status='cancelled', remaining_balance=0, updated_at=now()
WHERE id='7e571837-e4ff-432e-b3d6-aab9eb2eda69' AND status='active';

INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT 'e400bc7b-be01-4654-b9b7-7f30334e87e8','WITHDRAWAL',-29088.30,'LOAN-OVERDRAFT-da70ab1d-8909-4674-bfce-a7c33d8f26d4-2','LOAN_REPAYMENT',
 jsonb_build_object('description','Loan recovery (overdraft) – Installment #2. Replaces auto salary advance.','loan_id','da70ab1d-8909-4674-bfce-a7c33d8f26d4','installment',2,'source','overdraft_recovery','bypass_treasury_check',true,'bypass_treasury_accounts',true)
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference='LOAN-OVERDRAFT-da70ab1d-8909-4674-bfce-a7c33d8f26d4-2');

UPDATE public.loan_repayments SET deducted_from='Guarantor 1: UGX 27,611.698; Overdraft: UGX 29,088.30 (wallet negative)'
WHERE id='841dbfc3-32d5-48fe-9c0a-87e8eb5e787a';