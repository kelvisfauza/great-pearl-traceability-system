
DO $$
DECLARE
  emp RECORD;
  counter INT := 1;
BEGIN
  FOR emp IN 
    SELECT id FROM public.employees 
    WHERE employee_id IS NULL OR employee_id = '' 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.employees 
    SET employee_id = 'KCL-' || LPAD(counter::text, 4, '0')
    WHERE id = emp.id;
    counter := counter + 1;
  END LOOP;
END $$;
