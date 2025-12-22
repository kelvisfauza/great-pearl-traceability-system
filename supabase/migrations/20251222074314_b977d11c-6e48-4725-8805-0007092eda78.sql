-- Add Adinan Kariim to employees table
INSERT INTO public.employees (
  name,
  email,
  department,
  position,
  salary,
  role,
  status,
  auth_user_id,
  permissions
) VALUES (
  'Adinan Kariim',
  'adinankariim@greatpearlcoffee.com',
  'Quality Control',
  'Support Team',
  130000,
  'User',
  'Active',
  '651c7d8d-d860-463a-9d06-b2852a76975c',
  ARRAY['Quality Control', 'Quality Control:view']
);

-- Add Christmas voucher for Adinan (rank 12, same amount as others at bottom tier)
INSERT INTO public.christmas_vouchers (
  employee_id,
  employee_name,
  employee_email,
  voucher_amount,
  performance_rank,
  performance_score,
  christmas_message
) 
SELECT 
  id,
  'Adinan Kariim',
  'adinankariim@greatpearlcoffee.com',
  23529,
  12,
  70,
  'Merry Christmas! Thank you for your dedication to Great Pearl Coffee. Wishing you joy and success in the coming year!'
FROM employees WHERE email = 'adinankariim@greatpearlcoffee.com';