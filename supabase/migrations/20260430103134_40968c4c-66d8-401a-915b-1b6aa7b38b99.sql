
UPDATE public.loans
SET guarantor_email = 'sserunkumataufiq@greatpearlcoffee.com'
WHERE guarantor_email = 'sserunkumataufique@greatpearlcoffee.com';

-- Also fix any other tables that may reference the old email
UPDATE public.loans
SET employee_email = 'sserunkumataufiq@greatpearlcoffee.com'
WHERE employee_email = 'sserunkumataufique@greatpearlcoffee.com';
