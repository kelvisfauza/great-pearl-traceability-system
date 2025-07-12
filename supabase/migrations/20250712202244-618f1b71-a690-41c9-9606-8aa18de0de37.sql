
-- Create reports table to store generated reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Ready',
  format TEXT NOT NULL DEFAULT 'PDF',
  file_size TEXT,
  downloads INTEGER DEFAULT 0,
  generated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metrics table to store key performance metrics
CREATE TABLE public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  change_percentage DECIMAL,
  trend TEXT NOT NULL CHECK (trend IN ('up', 'down')),
  icon TEXT,
  color TEXT,
  category TEXT,
  date_recorded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance_data table for dashboard metrics
CREATE TABLE public.performance_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  value DECIMAL NOT NULL,
  target DECIMAL NOT NULL,
  percentage DECIMAL NOT NULL,
  trend TEXT NOT NULL CHECK (trend IN ('up', 'down')),
  change_percentage TEXT,
  month TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your authentication)
CREATE POLICY "Anyone can view reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reports" ON public.reports FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reports" ON public.reports FOR DELETE USING (true);

CREATE POLICY "Anyone can view metrics" ON public.metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert metrics" ON public.metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update metrics" ON public.metrics FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete metrics" ON public.metrics FOR DELETE USING (true);

CREATE POLICY "Anyone can view performance_data" ON public.performance_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert performance_data" ON public.performance_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update performance_data" ON public.performance_data FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete performance_data" ON public.performance_data FOR DELETE USING (true);

-- Insert some initial sample data
INSERT INTO public.metrics (label, value, change_percentage, trend, icon, color, category) VALUES
  ('Total Production', '2,847 bags', 12.5, 'up', 'Package', 'text-blue-600', 'production'),
  ('Quality Score', '94.2%', 2.1, 'up', 'Award', 'text-green-600', 'quality'),
  ('Revenue', 'UGX 847M', 8.7, 'up', 'DollarSign', 'text-yellow-600', 'finance'),
  ('Active Suppliers', '156', 3.2, 'up', 'Users', 'text-purple-600', 'suppliers'),
  ('Processing Efficiency', '87.3%', -1.2, 'down', 'TrendingUp', 'text-red-600', 'efficiency'),
  ('Export Volume', '1,234 bags', 15.8, 'up', 'Package', 'text-indigo-600', 'export');

INSERT INTO public.performance_data (category, value, target, percentage, trend, change_percentage, month) VALUES
  ('Production', 2847, 3000, 94.9, 'up', '+5.2%', 'current'),
  ('Quality', 94.2, 95, 99.2, 'up', '+1.8%', 'current'),
  ('Sales', 847, 900, 94.1, 'up', '+8.3%', 'current'),
  ('Efficiency', 87.3, 90, 97.0, 'down', '-2.1%', 'current');

INSERT INTO public.reports (name, type, category, description, status, format, file_size, downloads, generated_by) VALUES
  ('December Production Summary', 'Production', 'Operations', 'Daily production volumes and efficiency metrics', 'Ready', 'PDF', '2.3 MB', 12, 'System'),
  ('Q4 Financial Report', 'Finance', 'Finance', 'Revenue, expenses, and profit analysis', 'Ready', 'Excel', '1.8 MB', 8, 'System'),
  ('Weekly Quality Report - W52', 'Quality', 'Quality', 'Coffee quality scores and defect rates', 'Ready', 'PDF', '945 KB', 15, 'System'),
  ('Supplier Performance - December', 'Procurement', 'Procurement', 'Supplier delivery times and quality metrics', 'Processing', 'Excel', '1.2 MB', 0, 'System'),
  ('Inventory Analysis Report', 'Inventory', 'Inventory', 'Stock levels and turnover analysis', 'Failed', 'PDF', '856 KB', 0, 'System'),
  ('Sales Performance - November', 'Sales', 'Sales', 'Sales trends and customer analysis', 'Ready', 'Excel', '1.5 MB', 22, 'System');
