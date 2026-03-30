
CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START WITH 17;

CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    NEW.employee_id := 'KCL-' || LPAD(nextval('public.employee_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
