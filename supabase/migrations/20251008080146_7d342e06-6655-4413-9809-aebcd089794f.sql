-- Add indexes for better query performance across all frequently accessed tables

-- Coffee records indexes (most queried)
CREATE INDEX IF NOT EXISTS idx_coffee_records_status ON public.coffee_records(status);
CREATE INDEX IF NOT EXISTS idx_coffee_records_batch_number ON public.coffee_records(batch_number);
CREATE INDEX IF NOT EXISTS idx_coffee_records_date ON public.coffee_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_coffee_records_supplier_id ON public.coffee_records(supplier_id);

-- Quality assessments indexes
CREATE INDEX IF NOT EXISTS idx_quality_assessments_status ON public.quality_assessments(status);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_store_record_id ON public.quality_assessments(store_record_id);

-- Payment records indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_batch_number ON public.payment_records(batch_number);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON public.payment_records(date DESC);

-- Finance cash transactions indexes
CREATE INDEX IF NOT EXISTS idx_finance_cash_transactions_status ON public.finance_cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_finance_cash_transactions_type ON public.finance_cash_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_finance_cash_transactions_confirmed_at ON public.finance_cash_transactions(confirmed_at DESC);

-- Approval requests indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON public.approval_requests(created_at DESC);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);

-- Supplier advances indexes
CREATE INDEX IF NOT EXISTS idx_supplier_advances_supplier_id ON public.supplier_advances(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_advances_is_closed ON public.supplier_advances(is_closed);

-- Sales transactions indexes
CREATE INDEX IF NOT EXISTS idx_sales_transactions_date ON public.sales_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON public.sales_transactions(status);

-- Daily tasks indexes
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON public.daily_tasks(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_department ON public.daily_tasks(department);