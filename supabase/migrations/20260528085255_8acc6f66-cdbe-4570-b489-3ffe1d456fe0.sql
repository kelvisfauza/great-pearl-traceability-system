INSERT INTO public.salary_remittance_agreements
  (employee_id, employee_email, employee_name, recipient_name, recipient_phone, percentage, status, notes, created_by)
SELECT 'GAC-0008','bwambalebenson@greatpearlcoffee.com','Bwambale Benson','Benson Parents','0773650011',50,'active',
       'Signed agreement: 50% of monthly net salary auto-remitted to parents via Yo Payments','Fauzakusa@greatpearlcoffee.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.salary_remittance_agreements
  WHERE lower(employee_email)='bwambalebenson@greatpearlcoffee.com' AND status='active'
);