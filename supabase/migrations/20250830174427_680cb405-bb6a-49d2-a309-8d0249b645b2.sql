-- Drop RLS policies that depend on user_id columns temporarily
DROP POLICY IF EXISTS "Users can view their own ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "System can insert activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;

-- Now change column types from UUID to TEXT
ALTER TABLE public.ledger_entries ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.withdrawal_requests ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_accounts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_activity ALTER COLUMN user_id TYPE TEXT;

-- Recreate RLS policies with TEXT support
CREATE POLICY "Users can view their own ledger entries" 
ON public.ledger_entries FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert ledger entries" 
ON public.ledger_entries FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own activity" 
ON public.user_activity FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert activity" 
ON public.user_activity FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create withdrawal requests" 
ON public.withdrawal_requests FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can update withdrawal requests" 
ON public.withdrawal_requests FOR UPDATE 
USING (is_current_user_admin());