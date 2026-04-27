ALTER TABLE public.price_approval_requests DROP CONSTRAINT IF EXISTS price_approval_requests_status_check;

ALTER TABLE public.price_approval_requests
ADD CONSTRAINT price_approval_requests_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'dismissed'));