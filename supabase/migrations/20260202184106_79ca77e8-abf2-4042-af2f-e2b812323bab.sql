-- Create table for EUDR dispatch comparison reports
CREATE TABLE public.eudr_dispatch_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  
  -- Dispatch Information
  dispatch_date DATE NOT NULL,
  dispatch_location TEXT NOT NULL,
  coffee_type TEXT NOT NULL,
  destination_buyer TEXT NOT NULL,
  dispatch_supervisor TEXT NOT NULL,
  vehicle_registrations TEXT,
  
  -- Truck summaries (JSON array for flexibility)
  trucks JSONB NOT NULL DEFAULT '[]',
  
  -- Buyer Weighing & Verification (JSON array)
  buyer_verification JSONB NOT NULL DEFAULT '[]',
  
  -- Buyer Quality Checks
  quality_checked_by_buyer BOOLEAN DEFAULT false,
  buyer_quality_remarks TEXT,
  
  -- Bag & Weight Deductions
  bags_deducted INTEGER DEFAULT 0,
  deduction_reasons TEXT[] DEFAULT '{}',
  total_deducted_weight NUMERIC DEFAULT 0,
  
  -- Remarks
  remarks TEXT,
  
  -- File attachment
  attachment_url TEXT,
  attachment_name TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'submitted'
);

-- Enable RLS
ALTER TABLE public.eudr_dispatch_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view dispatch reports"
  ON public.eudr_dispatch_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create dispatch reports"
  ON public.eudr_dispatch_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creators can update their own reports"
  ON public.eudr_dispatch_reports FOR UPDATE
  USING (true);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispatch-attachments', 'dispatch-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view dispatch attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dispatch-attachments');

CREATE POLICY "Authenticated users can upload dispatch attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dispatch-attachments');

-- Trigger for updated_at
CREATE TRIGGER update_eudr_dispatch_reports_updated_at
  BEFORE UPDATE ON public.eudr_dispatch_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();