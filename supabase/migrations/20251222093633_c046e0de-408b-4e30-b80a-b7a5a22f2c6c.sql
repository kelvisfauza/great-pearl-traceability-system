-- Add status column to christmas_vouchers for approval flow
ALTER TABLE public.christmas_vouchers 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add completed tracking columns
ALTER TABLE public.christmas_vouchers 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Update existing claimed vouchers to 'claimed' status
UPDATE public.christmas_vouchers 
SET status = 'claimed' 
WHERE claimed_at IS NOT NULL AND status = 'pending';

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_christmas_vouchers_status ON public.christmas_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_christmas_vouchers_year_status ON public.christmas_vouchers(year, status);