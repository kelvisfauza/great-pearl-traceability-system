ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS alt_phone text;

INSERT INTO public.employees (name, email, phone, alt_phone, position, department, role, permissions, status, salary, join_date, date_of_birth, gender, national_id_number, address, is_training_account, profile_completed)
SELECT 'Muhindo Reagan', 'info.rhiganmuhindo@gmail.com', '0781235218', '0703059630',
       'Trainee - Field Extension & Crop Assessment', 'Training', 'Trainee',
       ARRAY['Store Management','Quality Control','Procurement','Finance','Inventory','Sales Marketing','EUDR Documentation'],
       'Active', 0, now(), '1998-09-24', 'Male', 'CM9801510FMHPJ', 'Kasese', false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees WHERE lower(email) = 'info.rhiganmuhindo@gmail.com'
);