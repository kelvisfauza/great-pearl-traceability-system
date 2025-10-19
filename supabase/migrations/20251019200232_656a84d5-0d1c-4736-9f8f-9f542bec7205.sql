-- Create report_templates table to store report definitions
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  supported_formats TEXT[] NOT NULL DEFAULT ARRAY['PDF'],
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view report templates"
  ON public.report_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage report templates"
  ON public.report_templates
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Insert the existing templates
INSERT INTO public.report_templates (name, description, category, frequency, supported_formats, data_sources) VALUES
('Production Report', 'Daily production volumes and efficiency metrics', 'Operations', 'Daily', ARRAY['PDF', 'Excel'], 
  '["inventory_items", "sales_transactions", "metrics"]'::jsonb),
('Quality Analysis', 'Coffee quality scores and defect rates', 'Quality', 'Weekly', ARRAY['PDF', 'Excel'],
  '["quality_assessments"]'::jsonb),
('Financial Summary', 'Revenue, expenses, and profit analysis', 'Finance', 'Monthly', ARRAY['PDF', 'Excel', 'CSV'],
  '["payment_records", "finance_cash_transactions", "sales_transactions", "daily_tasks"]'::jsonb),
('Supplier Performance', 'Supplier delivery times and quality metrics', 'Procurement', 'Weekly', ARRAY['PDF', 'Excel'],
  '["suppliers", "supplier_contracts", "payment_records"]'::jsonb),
('Inventory Status', 'Stock levels and turnover analysis', 'Inventory', 'Daily', ARRAY['PDF', 'Excel', 'CSV'],
  '["inventory_items", "inventory_movements", "sales_inventory_tracking"]'::jsonb),
('Sales Performance', 'Sales trends and customer analysis', 'Sales', 'Weekly', ARRAY['PDF', 'Excel'],
  '["sales_transactions", "sales_inventory_tracking"]'::jsonb);

-- Add trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();