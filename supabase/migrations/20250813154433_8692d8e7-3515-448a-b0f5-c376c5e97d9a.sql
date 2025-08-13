-- Create training employee account
INSERT INTO public.employees (
  name, 
  email, 
  phone, 
  position, 
  department, 
  employee_id, 
  address, 
  emergency_contact, 
  role, 
  permissions, 
  status,
  salary,
  is_training_account,
  training_progress
) VALUES (
  'Training User',
  'training@company.com',
  '+256-700-000-000',
  'Training Account',
  'Training',
  'TRN001',
  'Training Center, Main Office',
  '+256-700-000-001',
  'training',
  '{"view_dashboard", "basic_operations", "training_access"}',
  'Active',
  0,
  true,
  0
);

-- Assign training role to the training account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'training'::app_role 
FROM public.employees 
WHERE email = 'training@company.com';

-- Insert sample suppliers for training
INSERT INTO public.suppliers (name, code, phone, origin, opening_balance) VALUES
('Training Supplier A', 'TRN-SUP-001', '+256-700-100-001', 'Bushenyi', 50000),
('Training Supplier B', 'TRN-SUP-002', '+256-700-100-002', 'Kasese', 75000),
('Demo Coffee Farmers Co-op', 'TRN-SUP-003', '+256-700-100-003', 'Ntungamo', 100000);

-- Insert sample customers for training
INSERT INTO public.customers (name, country, email, phone, total_orders, total_value) VALUES
('Training Customer Europe', 'Germany', 'demo@europe-coffee.com', '+49-123-456-789', 5, 250000),
('Training Customer USA', 'United States', 'demo@usa-coffee.com', '+1-555-123-4567', 3, 180000),
('Demo Local Distributor', 'Uganda', 'demo@local-dist.ug', '+256-700-200-001', 8, 120000);

-- Insert sample inventory items for training
INSERT INTO public.inventory_items (coffee_type, location, total_bags, total_kilograms, status, batch_numbers) VALUES
('Arabica AA', 'Training Warehouse A', 50, 3000, 'available', '{"TRN-BATCH-001", "TRN-BATCH-002"}'),
('Robusta Screen 18', 'Training Warehouse B', 30, 1800, 'available', '{"TRN-BATCH-003"}'),
('Arabica AB', 'Training Warehouse A', 25, 1500, 'reserved', '{"TRN-BATCH-004"}');

-- Insert sample coffee records for training
INSERT INTO public.coffee_records (
  coffee_type, 
  supplier_name, 
  date, 
  kilograms, 
  bags, 
  status, 
  batch_number,
  supplier_id
) VALUES
('Arabica AA', 'Training Supplier A', CURRENT_DATE - INTERVAL '7 days', 1000, 17, 'received', 'TRN-BATCH-001', (SELECT id FROM suppliers WHERE code = 'TRN-SUP-001')),
('Robusta Screen 18', 'Training Supplier B', CURRENT_DATE - INTERVAL '5 days', 600, 10, 'received', 'TRN-BATCH-003', (SELECT id FROM suppliers WHERE code = 'TRN-SUP-002')),
('Arabica AB', 'Demo Coffee Farmers Co-op', CURRENT_DATE - INTERVAL '3 days', 800, 13, 'pending', 'TRN-BATCH-004', (SELECT id FROM suppliers WHERE code = 'TRN-SUP-003'));

-- Insert sample milling customers for training
INSERT INTO public.milling_customers (full_name, phone, address, opening_balance, current_balance) VALUES
('Training Milling Customer A', '+256-700-300-001', 'Training Address A, Kampala', 25000, 15000),
('Demo Mill Client B', '+256-700-300-002', 'Training Address B, Entebbe', 40000, 35000);

-- Insert sample quality assessments for training
INSERT INTO public.quality_assessments (
  batch_number,
  moisture,
  group1_defects,
  group2_defects,
  below12,
  pods,
  husks,
  stones,
  suggested_price,
  status,
  comments,
  assessed_by
) VALUES
('TRN-BATCH-001', 12.5, 2, 5, 3, 1, 2, 0, 4500, 'assessed', 'Good quality coffee, meets export standards', 'Training Quality Officer'),
('TRN-BATCH-003', 11.8, 1, 3, 2, 0, 1, 0, 4200, 'assessed', 'Excellent quality robusta, premium grade', 'Training Quality Officer');

-- Insert sample field agents for training
INSERT INTO public.field_agents (name, region, phone, collections_count, last_report_date) VALUES
('Training Agent Central', 'Central Region', '+256-700-400-001', 15, CURRENT_DATE - INTERVAL '2 days'),
('Demo Agent Western', 'Western Region', '+256-700-400-002', 12, CURRENT_DATE - INTERVAL '1 day');