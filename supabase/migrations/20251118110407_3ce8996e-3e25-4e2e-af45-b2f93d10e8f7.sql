-- ============================================================================
-- CRITICAL SECURITY FIX: Replace Overly Permissive RLS Policies (Part 1)
-- ============================================================================
-- Fixing critical tables with proper type handling
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEES TABLE - Protect Personal Information and Salaries
-- ============================================================================

DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;

CREATE POLICY "Users view own employee record" ON employees
FOR SELECT USING (
  auth_user_id = auth.uid() 
  OR user_has_permission('Human Resources')
  OR is_current_user_admin()
);

CREATE POLICY "HR and admins can insert employees" ON employees
FOR INSERT WITH CHECK (
  user_has_permission('Human Resources')
  OR is_current_user_admin()
);

CREATE POLICY "HR and admins can update employees" ON employees
FOR UPDATE USING (
  user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- ============================================================================
-- 2. APPROVAL_REQUESTS - Protect Financial Transaction Data
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view approval requests" ON approval_requests;

CREATE POLICY "Users view own approval requests" ON approval_requests
FOR SELECT USING (
  requestedby = (SELECT email FROM employees WHERE auth_user_id = auth.uid())
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR is_current_user_admin()
);

-- ============================================================================
-- 3. PAYMENT_RECORDS - Restrict Supplier Payment Details
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view payment_records" ON payment_records;
DROP POLICY IF EXISTS "Anyone can insert payment_records" ON payment_records;
DROP POLICY IF EXISTS "Anyone can update payment_records" ON payment_records;

CREATE POLICY "Finance can view payment records" ON payment_records
FOR SELECT USING (
  user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR is_current_user_admin()
);

CREATE POLICY "Finance can insert payment records" ON payment_records
FOR INSERT WITH CHECK (
  user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Finance can update payment records" ON payment_records
FOR UPDATE USING (
  user_has_permission('Finance')
  OR is_current_user_admin()
);

-- ============================================================================
-- 4. FINANCE_CASH_TRANSACTIONS - Protect Cash Movement Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view finance_cash_transactions" ON finance_cash_transactions;
DROP POLICY IF EXISTS "Anyone can insert finance_cash_transactions" ON finance_cash_transactions;

CREATE POLICY "Finance can manage cash transactions" ON finance_cash_transactions
FOR ALL USING (
  user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR is_current_user_admin()
);

-- ============================================================================
-- 5. WITHDRAWAL_REQUESTS - Protect User Financial Data (user_id is TEXT)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view withdrawal_requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Anyone can insert withdrawal_requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Anyone can update withdrawal_requests" ON withdrawal_requests;

CREATE POLICY "Users view own withdrawal requests" ON withdrawal_requests
FOR SELECT USING (
  user_id = auth.uid()::text
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests
FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
);

CREATE POLICY "Finance can update withdrawal requests" ON withdrawal_requests
FOR UPDATE USING (
  user_has_permission('Finance')
  OR is_current_user_admin()
);

-- ============================================================================
-- 6. MONEY_REQUESTS - Protect Personal Financial Requests (user_id is UUID)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view money_requests" ON money_requests;
DROP POLICY IF EXISTS "Anyone can insert money_requests" ON money_requests;
DROP POLICY IF EXISTS "Anyone can update money_requests" ON money_requests;

CREATE POLICY "Users view own money requests" ON money_requests
FOR SELECT USING (
  user_id = auth.uid()
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Users can insert own money requests" ON money_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Finance and admins can update money requests" ON money_requests
FOR UPDATE USING (
  user_has_permission('Finance')
  OR is_current_user_admin()
);

-- ============================================================================
-- 7. SUPPLIERS - Protect Business Relationships
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can manage suppliers" ON suppliers;

CREATE POLICY "Operations can view suppliers" ON suppliers
FOR SELECT USING (
  user_has_permission('Procurement')
  OR user_has_permission('Quality Control')
  OR user_has_permission('Store Management')
  OR is_current_user_admin()
);

CREATE POLICY "Procurement can manage suppliers" ON suppliers
FOR ALL USING (
  user_has_permission('Procurement')
  OR is_current_user_admin()
);

-- ============================================================================
-- 8. CUSTOMERS - Protect Customer Contact Information
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can manage customers" ON customers;

CREATE POLICY "Sales can view customers" ON customers
FOR SELECT USING (
  user_has_permission('Sales Marketing')
  OR is_current_user_admin()
);

CREATE POLICY "Sales can manage customers" ON customers
FOR ALL USING (
  user_has_permission('Sales Marketing')
  OR is_current_user_admin()
);

-- ============================================================================
-- 9. ATTENDANCE - Protect Employee Attendance Patterns
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view attendance" ON attendance;

CREATE POLICY "Users view own attendance" ON attendance
FOR SELECT USING (
  employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- ============================================================================
-- 10. QUALITY_ASSESSMENTS - Protect Quality Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view quality_assessments" ON quality_assessments;
DROP POLICY IF EXISTS "Anyone can insert quality_assessments" ON quality_assessments;
DROP POLICY IF EXISTS "Anyone can update quality_assessments" ON quality_assessments;

CREATE POLICY "Quality team can view assessments" ON quality_assessments
FOR SELECT USING (
  user_has_permission('Quality Control')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Quality team can manage assessments" ON quality_assessments
FOR ALL USING (
  user_has_permission('Quality Control')
  OR is_current_user_admin()
);

-- ============================================================================
-- 11. COFFEE_RECORDS - Protect Inventory and Pricing Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view coffee_records" ON coffee_records;
DROP POLICY IF EXISTS "Anyone can manage coffee_records" ON coffee_records;

CREATE POLICY "Operations can view coffee records" ON coffee_records
FOR SELECT USING (
  user_has_permission('Store Management')
  OR user_has_permission('Quality Control')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Store management can manage coffee records" ON coffee_records
FOR ALL USING (
  user_has_permission('Store Management')
  OR is_current_user_admin()
);

-- ============================================================================
-- 12. VERIFICATION_CODES - CRITICAL: No Public Access
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own verification codes" ON verification_codes;

-- No policies = only service role can access