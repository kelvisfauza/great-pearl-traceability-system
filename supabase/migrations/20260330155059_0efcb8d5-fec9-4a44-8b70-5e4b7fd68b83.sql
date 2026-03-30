
DROP TRIGGER IF EXISTS set_employee_id ON public.employees;
CREATE TRIGGER set_employee_id
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_employee_id();
