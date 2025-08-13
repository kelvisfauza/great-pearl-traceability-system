-- Create table for price recommendations by data analysts
CREATE TABLE public.price_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL,
  recommended_price NUMERIC NOT NULL,
  current_market_price NUMERIC,
  price_justification TEXT NOT NULL,
  quality_score NUMERIC,
  market_trend TEXT NOT NULL,
  confidence_level NUMERIC NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
  analyst_id TEXT NOT NULL,
  analyst_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  effective_date DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for trend analysis data
CREATE TABLE public.trend_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('price', 'quality', 'supply', 'demand', 'seasonal')),
  coffee_type TEXT NOT NULL,
  time_period TEXT NOT NULL,
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'volatile')),
  trend_strength NUMERIC NOT NULL CHECK (trend_strength >= 0 AND trend_strength <= 100),
  key_factors TEXT[],
  predicted_outcome TEXT,
  data_points JSONB,
  analyst_id TEXT NOT NULL,
  analyst_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for quality analysis reports
CREATE TABLE public.quality_analysis_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_title TEXT NOT NULL,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  coffee_types_analyzed TEXT[],
  average_quality_score NUMERIC,
  quality_trends JSONB,
  recommendations TEXT,
  key_findings TEXT[],
  impact_assessment TEXT,
  analyst_id TEXT NOT NULL,
  analyst_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for market insights
CREATE TABLE public.market_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('price_alert', 'supply_change', 'demand_shift', 'quality_impact', 'seasonal_pattern')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  affected_coffee_types TEXT[],
  recommended_actions TEXT[],
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  expiry_date DATE,
  analyst_id TEXT NOT NULL,
  analyst_name TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for procurement forecasts
CREATE TABLE public.procurement_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_period_start DATE NOT NULL,
  forecast_period_end DATE NOT NULL,
  coffee_type TEXT NOT NULL,
  predicted_supply NUMERIC,
  predicted_demand NUMERIC,
  recommended_procurement_quantity NUMERIC,
  expected_price_range_min NUMERIC,
  expected_price_range_max NUMERIC,
  risk_factors TEXT[],
  confidence_level NUMERIC CHECK (confidence_level >= 0 AND confidence_level <= 100),
  methodology TEXT,
  analyst_id TEXT NOT NULL,
  analyst_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_forecasts ENABLE ROW LEVEL SECURITY;

-- Create policies for price_recommendations
CREATE POLICY "Authenticated users can view price recommendations" 
ON public.price_recommendations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can create price recommendations" 
ON public.price_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can update their price recommendations" 
ON public.price_recommendations 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete price recommendations" 
ON public.price_recommendations 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create policies for trend_analysis
CREATE POLICY "Authenticated users can view trend analysis" 
ON public.trend_analysis 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can create trend analysis" 
ON public.trend_analysis 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can update trend analysis" 
ON public.trend_analysis 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete trend analysis" 
ON public.trend_analysis 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create policies for quality_analysis_reports
CREATE POLICY "Authenticated users can view quality analysis reports" 
ON public.quality_analysis_reports 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can create quality analysis reports" 
ON public.quality_analysis_reports 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can update quality analysis reports" 
ON public.quality_analysis_reports 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete quality analysis reports" 
ON public.quality_analysis_reports 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create policies for market_insights
CREATE POLICY "Authenticated users can view market insights" 
ON public.market_insights 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can create market insights" 
ON public.market_insights 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can update market insights" 
ON public.market_insights 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete market insights" 
ON public.market_insights 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create policies for procurement_forecasts
CREATE POLICY "Authenticated users can view procurement forecasts" 
ON public.procurement_forecasts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can create procurement forecasts" 
ON public.procurement_forecasts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Data analysts can update procurement forecasts" 
ON public.procurement_forecasts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete procurement forecasts" 
ON public.procurement_forecasts 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE TRIGGER update_price_recommendations_updated_at
BEFORE UPDATE ON public.price_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trend_analysis_updated_at
BEFORE UPDATE ON public.trend_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_analysis_reports_updated_at
BEFORE UPDATE ON public.quality_analysis_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_insights_updated_at
BEFORE UPDATE ON public.market_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procurement_forecasts_updated_at
BEFORE UPDATE ON public.procurement_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();