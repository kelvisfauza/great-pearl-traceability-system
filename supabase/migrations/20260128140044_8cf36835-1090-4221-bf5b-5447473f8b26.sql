-- Add is_correction column to price_approval_requests table
ALTER TABLE public.price_approval_requests
ADD COLUMN IF NOT EXISTS is_correction boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.price_approval_requests.is_correction IS 'True if this is a correction to already-approved prices for today';