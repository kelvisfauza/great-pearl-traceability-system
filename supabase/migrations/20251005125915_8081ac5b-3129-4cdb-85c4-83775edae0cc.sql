-- Create finance_coffee_lots table if missing (safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.finance_coffee_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_record_id UUID,
  quality_assessment_id UUID,
  supplier_id UUID,
  assessed_by TEXT NOT NULL,
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  quality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  unit_price_ugx NUMERIC NOT NULL DEFAULT 0,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  total_amount_ugx NUMERIC GENERATED ALWAYS AS (quantity_kg * unit_price_ugx) STORED,
  finance_status TEXT NOT NULL DEFAULT 'READY_FOR_FINANCE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.finance_coffee_lots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view finance_coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Anyone can insert finance_coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Anyone can update finance_coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Only admins can delete finance_coffee_lots" ON public.finance_coffee_lots;

-- Create fresh policies
CREATE POLICY "Anyone can view finance_coffee_lots"
ON public.finance_coffee_lots
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert finance_coffee_lots"
ON public.finance_coffee_lots
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update finance_coffee_lots"
ON public.finance_coffee_lots
FOR UPDATE
USING (true);

CREATE POLICY "Only admins can delete finance_coffee_lots"
ON public.finance_coffee_lots
FOR DELETE
USING (is_current_user_admin());

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_finance_coffee_lots_status 
ON public.finance_coffee_lots(finance_status);

CREATE INDEX IF NOT EXISTS idx_finance_coffee_lots_coffee_record 
ON public.finance_coffee_lots(coffee_record_id);