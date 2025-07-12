
-- Clear all data from salary_payments table
DELETE FROM public.salary_payments;

-- Clear all data from employees table  
DELETE FROM public.employees;

-- Reset the sequences (optional, but good practice)
-- This ensures that if you add new data, IDs start fresh
ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS salary_payments_id_seq RESTART WITH 1;
