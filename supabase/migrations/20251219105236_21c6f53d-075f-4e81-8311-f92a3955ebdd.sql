-- Add phone_number and payment_channel to money_requests table
ALTER TABLE public.money_requests 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS payment_channel text DEFAULT 'CASH';

-- Add a comment for clarity
COMMENT ON COLUMN public.money_requests.phone_number IS 'Phone number for mobile money payment';
COMMENT ON COLUMN public.money_requests.payment_channel IS 'Payment channel: CASH or MOBILE_MONEY';