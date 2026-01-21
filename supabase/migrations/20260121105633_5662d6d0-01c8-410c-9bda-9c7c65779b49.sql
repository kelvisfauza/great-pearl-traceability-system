-- Create comprehensive market intelligence reports table for Robusta and Drugar (Arabica)
CREATE TABLE public.market_intelligence_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Report Identification (Section 1)
  report_date DATE NOT NULL,
  reporting_period TEXT NOT NULL DEFAULT 'daily' CHECK (reporting_period IN ('daily', 'weekly', 'monthly')),
  coffee_type TEXT NOT NULL CHECK (coffee_type IN ('robusta', 'drugar')),
  analyst_name TEXT NOT NULL,
  market_reference TEXT NOT NULL DEFAULT 'ICE' CHECK (market_reference IN ('ICE', 'local', 'buyer_indications')),
  
  -- Market Summary (Section 2)
  market_direction TEXT NOT NULL DEFAULT 'sideways' CHECK (market_direction IN ('bullish', 'bearish', 'sideways')),
  key_market_drivers TEXT[] DEFAULT '{}',
  narrative_summary TEXT,
  
  -- Price Movement Analysis (Section 3)
  opening_price NUMERIC DEFAULT 0,
  closing_price NUMERIC DEFAULT 0,
  highest_price NUMERIC DEFAULT 0,
  lowest_price NUMERIC DEFAULT 0,
  price_change_percent NUMERIC DEFAULT 0,
  price_movement_interpretation TEXT,
  
  -- Volume & Supply Analysis (Section 4)
  global_supply_trend TEXT DEFAULT 'stable' CHECK (global_supply_trend IN ('increasing', 'decreasing', 'stable')),
  regional_supply_trend TEXT DEFAULT 'stable' CHECK (regional_supply_trend IN ('increasing', 'decreasing', 'stable')),
  factory_intake_volume NUMERIC DEFAULT 0,
  buyer_demand_level TEXT DEFAULT 'moderate' CHECK (buyer_demand_level IN ('low', 'moderate', 'high', 'very_high')),
  
  -- Comparative Analysis (Section 5)
  yesterday_comparison TEXT,
  weekly_comparison TEXT,
  monthly_comparison TEXT,
  
  -- Market Indicators & Sentiment (Section 6)
  market_momentum TEXT DEFAULT 'neutral' CHECK (market_momentum IN ('strong_up', 'weak_up', 'neutral', 'weak_down', 'strong_down')),
  buyer_aggressiveness TEXT DEFAULT 'moderate' CHECK (buyer_aggressiveness IN ('passive', 'moderate', 'aggressive', 'very_aggressive')),
  selling_pressure TEXT DEFAULT 'moderate' CHECK (selling_pressure IN ('low', 'moderate', 'high', 'very_high')),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Market Outlook (Section 7)
  short_term_outlook TEXT,
  medium_term_outlook TEXT,
  outlook_supporting_reasons TEXT,
  
  -- Strategic Recommendations (Section 8)
  recommended_action TEXT DEFAULT 'hold' CHECK (recommended_action IN ('buy', 'hold', 'delay', 'release')),
  recommended_price_range_min NUMERIC DEFAULT 0,
  recommended_price_range_max NUMERIC DEFAULT 0,
  volume_strategy TEXT,
  
  -- Risks & Alerts (Section 9)
  market_risks TEXT,
  operational_risks TEXT,
  compliance_risks TEXT,
  
  -- Sign-off (Section 10)
  prepared_by TEXT NOT NULL,
  reviewed_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per coffee type per day
  UNIQUE(report_date, coffee_type)
);

-- Enable Row Level Security
ALTER TABLE public.market_intelligence_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view market intelligence reports"
ON public.market_intelligence_reports
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create market intelligence reports"
ON public.market_intelligence_reports
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update market intelligence reports"
ON public.market_intelligence_reports
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_market_intelligence_reports_updated_at
BEFORE UPDATE ON public.market_intelligence_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();