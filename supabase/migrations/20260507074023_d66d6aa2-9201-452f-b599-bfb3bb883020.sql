DROP POLICY IF EXISTS "Milling operations can manage transactions" ON public.milling_transactions;

CREATE POLICY "Authenticated can insert milling transactions"
ON public.milling_transactions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can view milling transactions"
ON public.milling_transactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Milling ops can update milling transactions"
ON public.milling_transactions FOR UPDATE TO authenticated
USING (user_has_permission('Milling Operations') OR is_current_user_admin());

CREATE POLICY "Milling ops can delete milling transactions"
ON public.milling_transactions FOR DELETE TO authenticated
USING (user_has_permission('Milling Operations') OR is_current_user_admin());

-- Same for milling_cash_transactions
DROP POLICY IF EXISTS "Milling operations can manage cash transactions" ON public.milling_cash_transactions;

CREATE POLICY "Authenticated can insert milling cash"
ON public.milling_cash_transactions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can view milling cash"
ON public.milling_cash_transactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Milling ops can update milling cash"
ON public.milling_cash_transactions FOR UPDATE TO authenticated
USING (user_has_permission('Milling Operations') OR is_current_user_admin());

CREATE POLICY "Milling ops can delete milling cash"
ON public.milling_cash_transactions FOR DELETE TO authenticated
USING (user_has_permission('Milling Operations') OR is_current_user_admin());

-- Allow updating customer balance
DROP POLICY IF EXISTS "Milling operations can update customers" ON public.milling_customers;
CREATE POLICY "Authenticated can update milling customer balance"
ON public.milling_customers FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);