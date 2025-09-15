-- Add fields for two-way approval system to approval_requests table
ALTER TABLE public.approval_requests 
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_approved_by TEXT,
ADD COLUMN IF NOT EXISTS admin_approved_by TEXT,
ADD COLUMN IF NOT EXISTS approval_stage TEXT DEFAULT 'pending';