-- Fix 2: Secure remaining tables with overly permissive RLS policies (Part 2)

-- BUSINESS OPERATIONS TABLES
DROP POLICY IF EXISTS "Anyone can manage milling_expenses" ON milling_expenses;
DROP POLICY IF EXISTS "Finance can manage milling_expenses" ON milling_expenses;
CREATE POLICY "Finance can manage milling_expenses" ON milling_expenses
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Procurement can manage purchase_orders" ON purchase_orders;
CREATE POLICY "Procurement can manage purchase_orders" ON purchase_orders
FOR ALL USING (user_has_permission('Procurement') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage field_agents" ON field_agents;
DROP POLICY IF EXISTS "Operations can manage field_agents" ON field_agents;
CREATE POLICY "Operations can manage field_agents" ON field_agents
FOR ALL USING (user_has_permission('Operations') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage buying_stations" ON buying_stations;
DROP POLICY IF EXISTS "Operations can manage buying_stations" ON buying_stations;
CREATE POLICY "Operations can manage buying_stations" ON buying_stations
FOR ALL USING (user_has_permission('Operations') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage field_collections" ON field_collections;
DROP POLICY IF EXISTS "Operations can manage field_collections" ON field_collections;
CREATE POLICY "Operations can manage field_collections" ON field_collections
FOR ALL USING (user_has_permission('Operations') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage marketing_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Marketing can manage campaigns" ON marketing_campaigns;
CREATE POLICY "Marketing can manage campaigns" ON marketing_campaigns
FOR ALL USING (user_has_permission('Sales Marketing') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage sales_contracts" ON sales_contracts;
DROP POLICY IF EXISTS "Sales can manage contracts" ON sales_contracts;
CREATE POLICY "Sales can manage contracts" ON sales_contracts
FOR ALL USING (user_has_permission('Sales Marketing') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Store can manage inventory" ON inventory_items;
CREATE POLICY "Store can manage inventory" ON inventory_items
FOR ALL USING (user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage storage_locations" ON storage_locations;
DROP POLICY IF EXISTS "Store can manage storage" ON storage_locations;
CREATE POLICY "Store can manage storage" ON storage_locations
FOR ALL USING (user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can manage market_data" ON market_data;
DROP POLICY IF EXISTS "Sales can manage market_data" ON market_data;
CREATE POLICY "Sales can manage market_data" ON market_data
FOR ALL USING (user_has_permission('Sales Marketing') OR is_current_user_admin());

-- SUPPLIER & PARTNER DATA (drop existing first)
DROP POLICY IF EXISTS "Anyone can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Procurement can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Procurement can manage suppliers" ON suppliers;
CREATE POLICY "Procurement can view suppliers" ON suppliers
FOR SELECT USING (user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Procurement can manage suppliers" ON suppliers
FOR ALL USING (user_has_permission('Procurement') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can view company_employees" ON company_employees;
DROP POLICY IF EXISTS "Anyone can update company_employees" ON company_employees;
DROP POLICY IF EXISTS "Anyone can insert company_employees" ON company_employees;
DROP POLICY IF EXISTS "HR can manage company_employees" ON company_employees;
CREATE POLICY "HR can manage company_employees" ON company_employees
FOR ALL USING (user_has_permission('Human Resources') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can view warehouses" ON warehouses;
DROP POLICY IF EXISTS "Store can manage warehouses" ON warehouses;
CREATE POLICY "Store can manage warehouses" ON warehouses
FOR ALL USING (user_has_permission('Store Management') OR is_current_user_admin());

-- OPERATIONAL DATA
DROP POLICY IF EXISTS "Anyone can update coffee_records" ON coffee_records;

DROP POLICY IF EXISTS "Anyone can view reports" ON reports;
DROP POLICY IF EXISTS "Anyone can update reports" ON reports;
DROP POLICY IF EXISTS "Managers can view reports" ON reports;
DROP POLICY IF EXISTS "Managers can manage reports" ON reports;
CREATE POLICY "Managers can view reports" ON reports
FOR SELECT USING (
  user_has_permission('Finance Management') OR 
  user_has_permission('Operations') OR
  is_current_user_admin()
);
CREATE POLICY "Managers can manage reports" ON reports
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can view performance_data" ON performance_data;
DROP POLICY IF EXISTS "Anyone can update performance_data" ON performance_data;
DROP POLICY IF EXISTS "Managers can manage performance_data" ON performance_data;
CREATE POLICY "Managers can manage performance_data" ON performance_data
FOR ALL USING (user_has_permission('Human Resources') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can view daily_tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Anyone can update daily_tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Anyone can insert daily_tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Department can manage daily_tasks" ON daily_tasks;
CREATE POLICY "Department can manage daily_tasks" ON daily_tasks
FOR ALL USING (auth.uid() IS NOT NULL);

-- FINANCE-RELATED TABLES
DROP POLICY IF EXISTS "Finance users can manage finance_coffee_lots" ON finance_coffee_lots;
DROP POLICY IF EXISTS "Finance can manage coffee_lots" ON finance_coffee_lots;
CREATE POLICY "Finance can manage coffee_lots" ON finance_coffee_lots
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage supplier_advances" ON supplier_advances;
DROP POLICY IF EXISTS "Finance can manage supplier_advances" ON supplier_advances;
CREATE POLICY "Finance can manage supplier_advances" ON supplier_advances
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage supplier_payments" ON supplier_payments;
DROP POLICY IF EXISTS "Finance can manage supplier_payments" ON supplier_payments;
CREATE POLICY "Finance can manage supplier_payments" ON supplier_payments
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage advance_recoveries" ON advance_recoveries;
DROP POLICY IF EXISTS "Finance can manage advance_recoveries" ON advance_recoveries;
CREATE POLICY "Finance can manage advance_recoveries" ON advance_recoveries
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage cash_sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Finance can manage cash_sessions" ON cash_sessions;
CREATE POLICY "Finance can manage cash_sessions" ON cash_sessions
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage cash_movements" ON cash_movements;
DROP POLICY IF EXISTS "Finance can manage cash_movements" ON cash_movements;
CREATE POLICY "Finance can manage cash_movements" ON cash_movements
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Finance users can manage receipts" ON receipts;
DROP POLICY IF EXISTS "Finance can manage receipts" ON receipts;
CREATE POLICY "Finance can manage receipts" ON receipts
FOR ALL USING (user_has_permission('Finance Management') OR is_current_user_admin());