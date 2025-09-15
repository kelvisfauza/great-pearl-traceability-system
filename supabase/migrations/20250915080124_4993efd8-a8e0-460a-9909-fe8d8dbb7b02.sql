-- Add missing rejection_comments column to approval_requests table
ALTER TABLE public.approval_requests 
ADD COLUMN IF NOT EXISTS rejection_comments TEXT;