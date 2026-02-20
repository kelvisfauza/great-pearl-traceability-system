-- Insert missing salary advance for Benson (approved request 7f61522e)
INSERT INTO employee_salary_advances (employee_email, employee_name, original_amount, remaining_balance, minimum_payment, reason, status, created_by)
VALUES ('bwambalebenson@greatpearlcoffee.com', 'Bwambale Benson', 35000, 35000, 35000, 'phone recovery', 'active', 'System');