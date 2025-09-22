-- Add payment_method column to approval_requests table
ALTER TABLE public.approval_requests 
ADD COLUMN payment_method TEXT DEFAULT 'transfer';

-- Add admin_comments column to approval_requests table  
ALTER TABLE public.approval_requests 
ADD COLUMN admin_comments TEXT;