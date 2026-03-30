
-- Update all existing employee IDs from KCL to GAC
UPDATE public.employees SET employee_id = REPLACE(employee_id, 'KCL-', 'GAC-') WHERE employee_id LIKE 'KCL-%';

-- Update the auto-generate function to use GAC
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    NEW.employee_id := 'GAC-' || LPAD(nextval('public.employee_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
