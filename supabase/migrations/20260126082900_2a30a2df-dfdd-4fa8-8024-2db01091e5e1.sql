-- Create price_approval_requests table for pending price approvals
CREATE TABLE public.price_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Who submitted and when
  submitted_by TEXT NOT NULL,
  submitted_by_email TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Proposed prices (all fields from market_prices)
  ice_arabica NUMERIC,
  robusta NUMERIC,
  exchange_rate NUMERIC,
  drugar_local NUMERIC,
  wugar_local NUMERIC,
  robusta_faq_local NUMERIC,
  arabica_outturn NUMERIC,
  arabica_moisture NUMERIC,
  arabica_fm NUMERIC,
  arabica_buying_price NUMERIC NOT NULL,
  robusta_outturn NUMERIC,
  robusta_moisture NUMERIC,
  robusta_fm NUMERIC,
  robusta_buying_price NUMERIC NOT NULL,
  
  -- Whether to notify suppliers when approved
  notify_suppliers BOOLEAN DEFAULT false,
  
  -- Approval status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Admin response
  reviewed_by TEXT,
  reviewed_by_email TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  suggested_arabica_price NUMERIC,
  suggested_robusta_price NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all requests
CREATE POLICY "Authenticated users can view price approval requests"
ON public.price_approval_requests
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create requests
CREATE POLICY "Authenticated users can create price approval requests"
ON public.price_approval_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update requests (for admin approval)
CREATE POLICY "Authenticated users can update price approval requests"
ON public.price_approval_requests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_price_approval_status ON public.price_approval_requests(status);
CREATE INDEX idx_price_approval_submitted_at ON public.price_approval_requests(submitted_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_price_approval_requests_updated_at
BEFORE UPDATE ON public.price_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();