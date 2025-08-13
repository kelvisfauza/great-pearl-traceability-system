-- Create training role and extend user roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'training';

-- Add training mode flag to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS is_training_account boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS training_progress jsonb DEFAULT '{}';

-- Create training modules table
CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  module_order integer NOT NULL,
  department text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  completion_criteria jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create training progress tracking
CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.training_modules(id) ON DELETE CASCADE,
  completed_at timestamp with time zone,
  score integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS on new tables
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for training tables
CREATE POLICY "Anyone can view training modules" 
ON public.training_modules 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can track their training progress" 
ON public.training_progress 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert sample training modules
INSERT INTO public.training_modules (name, description, module_order, department, content) VALUES
('System Overview', 'Introduction to the coffee management system', 1, 'All', 
'{"steps": ["Dashboard navigation", "Menu structure", "Basic navigation", "User interface overview"], "duration": "15 minutes"}'),

('Procurement Basics', 'Learn how to manage suppliers and purchase orders', 2, 'Procurement',
'{"steps": ["Adding suppliers", "Creating purchase orders", "Managing contracts", "Quality assessments"], "duration": "30 minutes"}'),

('Finance Operations', 'Understanding financial workflows and reporting', 3, 'Finance',
'{"steps": ["Payment processing", "Expense tracking", "Salary management", "Financial reports"], "duration": "25 minutes"}'),

('Quality Control', 'Coffee quality assessment and grading procedures', 4, 'Quality Control',
'{"steps": ["Sample assessment", "Quality parameters", "Grading system", "Report generation"], "duration": "20 minutes"}'),

('Human Resources', 'Employee management and HR processes', 5, 'Human Resources',
'{"steps": ["Employee registration", "Role assignment", "Performance tracking", "Document management"], "duration": "25 minutes"}'),

('Inventory Management', 'Stock tracking and warehouse operations', 6, 'Inventory',
'{"steps": ["Stock entry", "Movement tracking", "Location management", "Inventory reports"], "duration": "20 minutes"}');

-- Create a sample training employee account
INSERT INTO public.employees (
  name, email, phone, position, department, employee_id, 
  role, permissions, status, is_training_account
) VALUES (
  'Training Demo User', 
  'training@company.com', 
  '+256700000000', 
  'Training Account', 
  'All Departments', 
  'TRAIN001',
  'Admin',
  ARRAY['Procurement', 'Quality Control', 'Finance', 'Human Resources', 'Inventory', 'Store Management', 'Reports', 'Data Analysis'],
  'Active',
  true
);

-- Create sample data for training (suppliers, customers, etc.)
INSERT INTO public.suppliers (name, code, phone, origin, opening_balance) VALUES
('Demo Supplier A', 'DEMO001', '+256701000001', 'Mbale', 50000),
('Demo Supplier B', 'DEMO002', '+256701000002', 'Kasese', 75000),
('Training Coffee Co', 'TRAIN001', '+256701000003', 'Bushenyi', 100000);

INSERT INTO public.customers (name, country, email, phone, status) VALUES
('Demo Export Customer', 'Germany', 'demo@customer.com', '+49123456789', 'Active'),
('Training Buyer Ltd', 'Netherlands', 'training@buyer.com', '+31123456789', 'Active');

-- Add sample inventory items
INSERT INTO public.inventory_items (coffee_type, location, total_bags, total_kilograms, status) VALUES
('Arabica AA', 'Training Warehouse', 100, 6000, 'available'),
('Robusta Screen 18', 'Training Warehouse', 150, 9000, 'available'),
('Arabica AB', 'Demo Storage', 75, 4500, 'available');

-- Update timestamps trigger for training tables
CREATE TRIGGER update_training_modules_updated_at
BEFORE UPDATE ON public.training_modules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_training_progress_updated_at
BEFORE UPDATE ON public.training_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();