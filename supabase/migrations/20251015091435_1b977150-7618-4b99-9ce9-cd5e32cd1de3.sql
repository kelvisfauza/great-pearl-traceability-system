-- Update metrics table structure to support both key metrics and performance data
DROP TABLE IF EXISTS public.metrics CASCADE;

CREATE TABLE public.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 'key_metric' or 'performance'
  category text NOT NULL,
  label text,
  value_numeric numeric,
  value_text text,
  target numeric,
  percentage numeric,
  change_percentage numeric,
  trend text DEFAULT 'stable',
  icon text,
  color text,
  month text DEFAULT 'current',
  date_recorded date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view metrics"
  ON public.metrics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert metrics"
  ON public.metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update metrics"
  ON public.metrics FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete metrics"
  ON public.metrics FOR DELETE
  USING (is_current_user_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for key metrics
INSERT INTO public.metrics (metric_type, category, label, value_text, change_percentage, trend, icon, color) VALUES
  ('key_metric', 'production', 'Total Production', '2,847 bags', 12.5, 'up', 'Package', 'text-blue-600'),
  ('key_metric', 'quality', 'Quality Score', '94.2%', 2.1, 'up', 'Award', 'text-green-600'),
  ('key_metric', 'finance', 'Revenue', 'UGX 847M', 8.7, 'up', 'DollarSign', 'text-yellow-600'),
  ('key_metric', 'suppliers', 'Active Suppliers', '156', 3.2, 'up', 'Users', 'text-purple-600');

-- Insert sample data for performance metrics
INSERT INTO public.metrics (metric_type, category, value_numeric, target, percentage, change_percentage, trend, month) VALUES
  ('performance', 'Production', 2847, 3000, 94.9, 5.2, 'up', 'current'),
  ('performance', 'Quality', 94.2, 95, 99.2, 1.8, 'up', 'current'),
  ('performance', 'Sales', 847, 900, 94.1, 8.3, 'up', 'current'),
  ('performance', 'Efficiency', 87.3, 90, 97.0, -2.1, 'down', 'current');