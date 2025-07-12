
-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  employee_id TEXT,
  address TEXT,
  emergency_contact TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Active',
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary_payments table
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  total_pay NUMERIC NOT NULL DEFAULT 0,
  bonuses NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  processed_by TEXT NOT NULL,
  processed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  notes TEXT,
  employee_details JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table (allowing public access for now)
CREATE POLICY "Anyone can view employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete employees" ON public.employees FOR DELETE USING (true);

-- Create policies for salary_payments table (allowing public access for now)
CREATE POLICY "Anyone can view salary payments" ON public.salary_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert salary payments" ON public.salary_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update salary payments" ON public.salary_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete salary payments" ON public.salary_payments FOR DELETE USING (true);

-- Insert some sample data for testing
INSERT INTO public.employees (name, email, position, department, salary, employee_id, role, permissions, status) VALUES
('John Doe', 'john.doe@greatpearl.com', 'Operations Manager', 'Operations', 2500000, 'EMP001', 'Manager', ARRAY['Operations', 'Inventory Management'], 'Active'),
('Jane Smith', 'jane.smith@greatpearl.com', 'Quality Inspector', 'Quality Control', 2100000, 'EMP002', 'User', ARRAY['Quality Control'], 'Active'),
('Mike Johnson', 'mike.johnson@greatpearl.com', 'Production Supervisor', 'Production', 1850000, 'EMP003', 'Supervisor', ARRAY['Production', 'Processing'], 'Active'),
('Sarah Wilson', 'sarah.wilson@greatpearl.com', 'HR Manager', 'Administration', 2800000, 'EMP004', 'Administrator', ARRAY['Human Resources', 'Reports'], 'Active'),
('David Brown', 'david.brown@greatpearl.com', 'Finance Officer', 'Administration', 2400000, 'EMP005', 'User', ARRAY['Finance'], 'Active');
