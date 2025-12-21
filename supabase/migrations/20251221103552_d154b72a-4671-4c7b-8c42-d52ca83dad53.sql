-- Create table for quick quality analyses
CREATE TABLE IF NOT EXISTS public.quick_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  coffee_type text NOT NULL,
  ref_price numeric NOT NULL,
  moisture numeric,
  gp1 numeric,
  gp2 numeric,
  less12 numeric,
  pods numeric,
  husks numeric,
  stones numeric,
  discretion numeric DEFAULT 500,
  fm numeric,
  actual_ott numeric,
  clean_d14 numeric,
  outturn numeric,
  outturn_price numeric,
  final_price numeric,
  quality_note text,
  is_rejected boolean DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view quick analyses"
ON public.quick_analyses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert quick analyses"
ON public.quick_analyses
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update quick analyses"
ON public.quick_analyses
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete quick analyses"
ON public.quick_analyses
FOR DELETE
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX idx_quick_analyses_created_at ON public.quick_analyses(created_at DESC);
CREATE INDEX idx_quick_analyses_supplier ON public.quick_analyses(supplier_name);