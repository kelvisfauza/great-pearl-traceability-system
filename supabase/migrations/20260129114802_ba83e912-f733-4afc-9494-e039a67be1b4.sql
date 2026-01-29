-- Insert notifications for the most recent announcement (SALARY PAYMENTS) to all active employees
INSERT INTO public.notifications (type, title, message, priority, target_user_id, target_department, is_read)
SELECT 
  'announcement',
  'SALARY PAYMENTS',
  'Hi Team, please submit your Salary requests today, latest tommorw so that there processed in time. thanks',
  'high',
  e.id,
  e.department,
  false
FROM public.employees e
WHERE e.status = 'Active'
  AND e.department IN ('Operations', 'Quality Control', 'Production', 'Administration', 'Finance', 'Sales & Marketing', 'HR', 'Store', 'Reports', 'IT', 'Data Analysis', 'Milling');