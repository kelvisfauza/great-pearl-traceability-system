
-- Create the approval_requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount TEXT NOT NULL,
  requestedBy TEXT NOT NULL,
  dateRequested TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Pending',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for approval_requests
CREATE POLICY "Anyone can view approval requests"
  ON public.approval_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert approval requests"
  ON public.approval_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update approval requests"
  ON public.approval_requests
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete approval requests"
  ON public.approval_requests
  FOR DELETE
  USING (true);

-- Insert some sample approval requests
INSERT INTO public.approval_requests (department, type, title, description, amount, requestedBy, dateRequested, priority, status, details) VALUES
('Procurement', 'Purchase Order', 'Coffee Bean Purchase', 'High-quality Arabica beans from local farmers', 'UGX 2.5M', 'Sarah Nakato', '2025-01-10', 'High', 'Pending', '{"supplier": "Green Hills Farm", "quantity": "500kg", "delivery_date": "2025-01-20"}'),
('Human Resources', 'Staff Request', 'Additional Quality Inspector', 'Need experienced quality control specialist', 'UGX 1.8M', 'David Mugisha', '2025-01-11', 'Medium', 'Pending', '{"position": "Quality Inspector", "experience": "3+ years", "start_date": "2025-02-01"}'),
('Finance', 'Budget Allocation', 'Equipment Maintenance Fund', 'Annual maintenance budget for processing equipment', 'UGX 5.2M', 'Grace Nambi', '2025-01-09', 'High', 'Pending', '{"equipment": "Roasting machines, grinders", "maintenance_period": "Q1-Q2 2025"}'),
('Processing', 'Equipment Purchase', 'New Coffee Grinder', 'Industrial-grade coffee grinder for increased capacity', 'UGX 3.1M', 'James Kato', '2025-01-12', 'Medium', 'Pending', '{"model": "Industrial Pro X200", "capacity": "50kg/hour", "installation": "Within 2 weeks"}');
