-- Create market_reports table for daily market analysis reports
CREATE TABLE public.market_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'auto' CHECK (report_type IN ('auto', 'manual')),
  created_by TEXT NOT NULL,
  arabica_price NUMERIC DEFAULT 0,
  robusta_price NUMERIC DEFAULT 0,
  ice_arabica NUMERIC DEFAULT 0,
  ice_robusta NUMERIC DEFAULT 0,
  market_trend TEXT DEFAULT 'stable' CHECK (market_trend IN ('bullish', 'stable', 'bearish')),
  analysis_notes TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_date, report_type)
);

-- Enable RLS
ALTER TABLE public.market_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view market reports"
ON public.market_reports
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert market reports"
ON public.market_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update market reports"
ON public.market_reports
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_market_reports_date ON public.market_reports(report_date DESC);
CREATE INDEX idx_market_reports_type ON public.market_reports(report_type);