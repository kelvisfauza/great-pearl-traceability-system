-- ============================================================================
-- CRITICAL SECURITY FIX: Replace Overly Permissive RLS Policies (Part 2)
-- ============================================================================
-- Completing the remaining tables
-- ============================================================================

-- ============================================================================
-- 13. FARMER_PROFILES - Protect Farmer Contact Information
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view farmer_profiles" ON farmer_profiles;
DROP POLICY IF EXISTS "Anyone can insert farmer_profiles" ON farmer_profiles;
DROP POLICY IF EXISTS "Anyone can update farmer_profiles" ON farmer_profiles;

CREATE POLICY "Field operations can view farmer profiles" ON farmer_profiles
FOR SELECT USING (
  user_has_permission('Field Operations')
  OR user_has_permission('Procurement')
  OR is_current_user_admin()
);

CREATE POLICY "Field operations can manage farmer profiles" ON farmer_profiles
FOR ALL USING (
  user_has_permission('Field Operations')
  OR is_current_user_admin()
);

-- ============================================================================
-- 14. FIELD_PURCHASES - Protect Field Purchase Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view field_purchases" ON field_purchases;
DROP POLICY IF EXISTS "Anyone can insert field_purchases" ON field_purchases;
DROP POLICY IF EXISTS "Anyone can update field_purchases" ON field_purchases;

CREATE POLICY "Field operations can view purchases" ON field_purchases
FOR SELECT USING (
  user_has_permission('Field Operations')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Field operations can manage purchases" ON field_purchases
FOR ALL USING (
  user_has_permission('Field Operations')
  OR is_current_user_admin()
);

-- ============================================================================
-- 15. MILLING_CUSTOMERS - Protect Milling Customer Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view milling_customers" ON milling_customers;
DROP POLICY IF EXISTS "Anyone can insert milling_customers" ON milling_customers;
DROP POLICY IF EXISTS "Anyone can update milling_customers" ON milling_customers;

CREATE POLICY "Milling operations can view customers" ON milling_customers
FOR SELECT USING (
  user_has_permission('Milling Operations')
  OR is_current_user_admin()
);

CREATE POLICY "Milling operations can manage customers" ON milling_customers
FOR ALL USING (
  user_has_permission('Milling Operations')
  OR is_current_user_admin()
);

-- ============================================================================
-- 16. MILLING_TRANSACTIONS - Protect Milling Financial Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view milling_transactions" ON milling_transactions;
DROP POLICY IF EXISTS "Anyone can insert milling_transactions" ON milling_transactions;
DROP POLICY IF EXISTS "Anyone can update milling_transactions" ON milling_transactions;

CREATE POLICY "Milling operations can manage transactions" ON milling_transactions
FOR ALL USING (
  user_has_permission('Milling Operations')
  OR is_current_user_admin()
);

-- ============================================================================
-- 17. SALES_TRANSACTIONS - Protect Sales Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view sales_transactions" ON sales_transactions;
DROP POLICY IF EXISTS "Anyone can insert sales_transactions" ON sales_transactions;
DROP POLICY IF EXISTS "Anyone can update sales_transactions" ON sales_transactions;

CREATE POLICY "Sales team can view transactions" ON sales_transactions
FOR SELECT USING (
  user_has_permission('Sales Marketing')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Sales team can manage transactions" ON sales_transactions
FOR ALL USING (
  user_has_permission('Sales Marketing')
  OR is_current_user_admin()
);

-- ============================================================================
-- 18. SALARY_PAYMENTS - Protect Employee Compensation Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "Anyone can insert salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "Anyone can update salary_payments" ON salary_payments;

CREATE POLICY "Finance and HR can manage salary payments" ON salary_payments
FOR ALL USING (
  user_has_permission('Finance')
  OR user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- ============================================================================
-- 19. SALARY_PAYSLIPS - Protect Payslip Data
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view salary_payslips" ON salary_payslips;
DROP POLICY IF EXISTS "Anyone can insert salary_payslips" ON salary_payslips;
DROP POLICY IF EXISTS "Anyone can update salary_payslips" ON salary_payslips;

CREATE POLICY "Finance and HR can manage payslips" ON salary_payslips
FOR ALL USING (
  user_has_permission('Finance')
  OR user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- ============================================================================
-- 20. LEDGER_ENTRIES - Protect Financial Ledger
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view ledger_entries" ON ledger_entries;
DROP POLICY IF EXISTS "Anyone can insert ledger_entries" ON ledger_entries;

CREATE POLICY "Users view own ledger entries" ON ledger_entries
FOR SELECT USING (
  user_id = auth.uid()::text
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

CREATE POLICY "Finance can manage ledger entries" ON ledger_entries
FOR ALL USING (
  user_has_permission('Finance')
  OR is_current_user_admin()
);

-- ============================================================================
-- DONE: All critical tables now have proper role-based access control
-- ============================================================================