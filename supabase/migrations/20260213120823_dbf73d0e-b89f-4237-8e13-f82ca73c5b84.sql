-- Insert Benson's approved salary advance that was missed during approval flow
INSERT INTO public.employee_salary_advances (employee_email, employee_name, original_amount, remaining_balance, minimum_payment, reason, status, created_by)
VALUES ('bwambalebenson@greatpearlcoffee.com', 'Bwambale Benson', 60000, 60000, 60000, 'issues', 'active', 'System');
