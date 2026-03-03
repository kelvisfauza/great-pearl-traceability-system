-- Seed data allowance configs
INSERT INTO public.monthly_allowances (employee_email, employee_name, allowance_type, amount) VALUES
('bwambaledenis@greatpearlcoffee.com', 'bwambale denis', 'data_allowance', 50000),
('musemawyclif@greatpearlcoffee.com', 'Musema Wyclif', 'data_allowance', 50000),
('fauzakusa@greatpearlcoffee.com', 'Fauza Kusa 2', 'data_allowance', 50000),
('bwambalemorjalia@greatpearlcoffee.com', 'Morjalia Jadens', 'data_allowance', 25000),
('johnmasereka@greatpearlcoffee.com', 'John Masereka', 'data_allowance', 25000),
('godwinmukobi@greatpearlcoffee.com', 'Mukobi Godwin', 'data_allowance', 25000),
('tatwanzire@greatpearlcoffee.com', 'Artwanzire Timothy', 'data_allowance', 25000);

-- Insert airtime allowance for ALL active employees
INSERT INTO public.monthly_allowances (employee_email, employee_name, allowance_type, amount)
SELECT email, name, 'airtime_allowance', 20000
FROM public.employees
WHERE status = 'Active';