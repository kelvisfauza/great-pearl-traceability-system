
-- Approval action tokens for email-based approve/reject
CREATE TABLE public.approval_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  approver_email TEXT NOT NULL,
  approver_name TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  approval_stage TEXT NOT NULL DEFAULT 'finance',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_approval_tokens_token ON public.approval_action_tokens(token);
CREATE INDEX idx_approval_tokens_request ON public.approval_action_tokens(request_id);

-- Enable RLS
ALTER TABLE public.approval_action_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (via Edge Functions)
CREATE POLICY "Service role full access" ON public.approval_action_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Function to invalidate all pending tokens for a request
CREATE OR REPLACE FUNCTION public.invalidate_request_tokens(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.approval_action_tokens
  SET status = 'expired'
  WHERE request_id = p_request_id AND status = 'pending';
END;
$$;
