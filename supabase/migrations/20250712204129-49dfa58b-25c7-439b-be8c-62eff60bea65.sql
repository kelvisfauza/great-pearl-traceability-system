
-- Create quality_assessments table
CREATE TABLE public.quality_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_record_id UUID REFERENCES public.coffee_records(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  moisture DECIMAL NOT NULL,
  group1_defects DECIMAL DEFAULT 0,
  group2_defects DECIMAL DEFAULT 0,
  below12 DECIMAL DEFAULT 0,
  pods DECIMAL DEFAULT 0,
  husks DECIMAL DEFAULT 0,
  stones DECIMAL DEFAULT 0,
  suggested_price DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'assessed' CHECK (status IN ('assessed', 'submitted_to_finance', 'price_requested', 'approved', 'dispatched')),
  comments TEXT,
  date_assessed DATE NOT NULL DEFAULT CURRENT_DATE,
  assessed_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.quality_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view quality_assessments" ON public.quality_assessments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quality_assessments" ON public.quality_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quality_assessments" ON public.quality_assessments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quality_assessments" ON public.quality_assessments FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_quality_assessments_store_record_id ON public.quality_assessments(store_record_id);
CREATE INDEX idx_quality_assessments_batch_number ON public.quality_assessments(batch_number);
CREATE INDEX idx_quality_assessments_status ON public.quality_assessments(status);
