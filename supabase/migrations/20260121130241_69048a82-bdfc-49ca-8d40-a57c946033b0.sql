-- Add market screenshot URL column to market_intelligence_reports
ALTER TABLE public.market_intelligence_reports 
ADD COLUMN IF NOT EXISTS market_screenshot_url TEXT;

-- Create storage bucket for market intelligence screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('market-screenshots', 'market-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for market-screenshots bucket
CREATE POLICY "Anyone can view market screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'market-screenshots');

CREATE POLICY "Authenticated users can upload market screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'market-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'market-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'market-screenshots' AND auth.role() = 'authenticated');