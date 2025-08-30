-- Add Morjalia to Supabase employees table
INSERT INTO public.employees (
  name,
  email,
  phone,
  position,
  department,
  salary,
  role,
  permissions,
  status,
  join_date,
  created_at,
  updated_at
) VALUES (
  'Morjalia Jadens',
  'morjaliajadens@gmail.com',
  '+256760698680',
  'Staff',
  'Production',
  150000,
  'User',
  '{"General Access"}',
  'Active',
  '2025-08-01 08:00:00+00',
  now(),
  now()
);