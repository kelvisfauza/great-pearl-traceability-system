-- Add dual approval tracking columns for salary requests
ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS finance_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_approved_by TEXT,
ADD COLUMN IF NOT EXISTS admin_approved_by TEXT;