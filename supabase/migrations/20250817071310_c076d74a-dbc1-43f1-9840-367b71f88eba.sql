-- Enable RLS on withdrawal_requests table
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Administrator', 'Finance Manager')
    AND status = 'Active'
  )
);

-- Create policies for user_accounts table if not exists
CREATE POLICY "Users can view their own account" 
ON public.user_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account" 
ON public.user_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger to process withdrawal status updates
CREATE OR REPLACE FUNCTION public.process_withdrawal_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If withdrawal is marked as failed, refund the amount
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE public.user_accounts 
    SET 
      current_balance = current_balance + NEW.amount,
      total_withdrawn = GREATEST(total_withdrawn - NEW.amount, 0),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for withdrawal completion
DROP TRIGGER IF EXISTS withdrawal_completion_trigger ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_completion_trigger
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_withdrawal_completion();