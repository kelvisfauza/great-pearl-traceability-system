-- ============ ENUMS ============
CREATE TYPE public.v3_role AS ENUM (
  'managing_director','operations_manager','branch_manager',
  'quality_manager','quality_officer',
  'store_manager','storekeeper',
  'production_manager','production_operator',
  'trade_manager','logistics_manager','driver',
  'export_manager','export_officer',
  'compliance_officer','finance_manager','finance_officer',
  'procurement_it','hr_admin','v3_admin'
);

CREATE TYPE public.v3_stock_state AS ENUM (
  'awaiting_quality','awaiting_purchase','branch_stock','in_transit',
  'main_store_received','production','processed_stock','allocated',
  'export_ready','loaded','shipped','rejected','quarantined'
);

CREATE TYPE public.v3_receiving_status AS ENUM (
  'draft','awaiting_quality','quality_submitted','awaiting_approval',
  'approved','weighed','grn_issued','paid','rejected','cancelled'
);

CREATE TYPE public.v3_transfer_status AS ENUM (
  'awaiting_approval','loading','dispatched','in_transit','arrived',
  'under_verification','received','received_with_variance','cancelled'
);

CREATE TYPE public.v3_shipment_status AS ENUM (
  'planned','allocated','processing','documents_pending','ready_to_load',
  'loaded','customs','shipped','delivered','closed','cancelled'
);

CREATE TYPE public.v3_payment_status AS ENUM (
  'draft','pending_approval','approved','paid','failed','cancelled'
);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ ROLES ============
CREATE TABLE public.v3_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.v3_role NOT NULL,
  branch_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.v3_user_roles TO authenticated;
GRANT ALL ON public.v3_user_roles TO service_role;
ALTER TABLE public.v3_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_v3_role(_user_id UUID, _role public.v3_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v3_user_roles
    WHERE user_id = _user_id AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_v3_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v3_user_roles
    WHERE user_id = _user_id
      AND role IN ('v3_admin','managing_director','operations_manager')
      AND (expires_at IS NULL OR expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role IN ('Super Admin','Administrator')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_v3_role(_user_id UUID, _roles public.v3_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_v3_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.v3_user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE POLICY "v3_roles_self_read" ON public.v3_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_v3_admin(auth.uid()));
CREATE POLICY "v3_roles_admin_write" ON public.v3_user_roles FOR ALL TO authenticated
  USING (public.is_v3_admin(auth.uid())) WITH CHECK (public.is_v3_admin(auth.uid()));

-- ============ BRANCHES ============
CREATE TABLE public.v3_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  is_head_office BOOLEAN NOT NULL DEFAULT false,
  float_balance NUMERIC NOT NULL DEFAULT 0,
  approval_limit NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_branches TO authenticated;
GRANT ALL ON public.v3_branches TO service_role;
ALTER TABLE public.v3_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_branches_read" ON public.v3_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_branches_write" ON public.v3_branches FOR ALL TO authenticated
  USING (public.is_v3_admin(auth.uid())) WITH CHECK (public.is_v3_admin(auth.uid()));
CREATE TRIGGER trg_v3_branches_updated BEFORE UPDATE ON public.v3_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUPPLIERS ============
CREATE TABLE public.v3_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  national_id TEXT,
  tin TEXT,
  district TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  bank_details TEXT,
  branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_suppliers TO authenticated;
GRANT ALL ON public.v3_suppliers TO service_role;
ALTER TABLE public.v3_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_suppliers_read" ON public.v3_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_suppliers_write" ON public.v3_suppliers FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','trade_manager','compliance_officer']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','trade_manager','compliance_officer']::public.v3_role[]));
CREATE TRIGGER trg_v3_suppliers_updated BEFORE UPDATE ON public.v3_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REFERENCE PRICES ============
CREATE TABLE public.v3_reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coffee_type TEXT NOT NULL,
  grade TEXT,
  reference_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  bonus_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  penalty_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  set_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_date, coffee_type, grade)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_reference_prices TO authenticated;
GRANT ALL ON public.v3_reference_prices TO service_role;
ALTER TABLE public.v3_reference_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_prices_read" ON public.v3_reference_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_prices_write" ON public.v3_reference_prices FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_prices_updated BEFORE UPDATE ON public.v3_reference_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RECEIVING RECORDS ============
CREATE TABLE public.v3_receiving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_number TEXT NOT NULL UNIQUE,
  sample_code TEXT NOT NULL,
  branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.v3_suppliers(id) ON DELETE SET NULL,
  workflow TEXT NOT NULL DEFAULT 'quality_first',
  status public.v3_receiving_status NOT NULL DEFAULT 'draft',
  coffee_type TEXT NOT NULL,
  processing_type TEXT,
  bags INTEGER NOT NULL DEFAULT 0,
  packaging_type TEXT,
  vehicle TEXT,
  driver_name TEXT,
  scale_device TEXT,
  gross_weight NUMERIC,
  tare_weight NUMERIC,
  net_weight NUMERIC,
  manual_weight_reason TEXT,
  weight_confirmed_by UUID,
  weight_confirmed_at TIMESTAMPTZ,
  reference_price NUMERIC,
  price_adjustments NUMERIC DEFAULT 0,
  final_price NUMERIC,
  total_amount NUMERIC,
  override_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_id TEXT,
  synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_receiving_records TO authenticated;
GRANT ALL ON public.v3_receiving_records TO service_role;
ALTER TABLE public.v3_receiving_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_receiving_read" ON public.v3_receiving_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_receiving_write" ON public.v3_receiving_records FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['storekeeper','store_manager','branch_manager','quality_manager','finance_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['storekeeper','store_manager','branch_manager','quality_manager','finance_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_receiving_updated BEFORE UPDATE ON public.v3_receiving_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUALITY ANALYSES ============
CREATE TABLE public.v3_quality_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id UUID NOT NULL REFERENCES public.v3_receiving_records(id) ON DELETE CASCADE,
  sample_code TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'head_office',
  moisture NUMERIC,
  outturn NUMERIC,
  foreign_matter NUMERIC,
  screen_size TEXT,
  defect_black NUMERIC DEFAULT 0,
  defect_pods NUMERIC DEFAULT 0,
  defect_husks NUMERIC DEFAULT 0,
  defect_triage NUMERIC DEFAULT 0,
  defect_broken NUMERIC DEFAULT 0,
  defect_insect NUMERIC DEFAULT 0,
  cup_score NUMERIC,
  cup_notes TEXT,
  recommendation TEXT,
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  analysed_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  retest_requested BOOLEAN NOT NULL DEFAULT false,
  retest_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_quality_analyses TO authenticated;
GRANT ALL ON public.v3_quality_analyses TO service_role;
ALTER TABLE public.v3_quality_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_quality_read" ON public.v3_quality_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_quality_write" ON public.v3_quality_analyses FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['quality_officer','quality_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['quality_officer','quality_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_quality_updated BEFORE UPDATE ON public.v3_quality_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- lock submitted results unless quality manager reopens
CREATE OR REPLACE FUNCTION public.v3_lock_submitted_quality()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.submitted AND NOT public.has_any_v3_role(auth.uid(), ARRAY['quality_manager']::public.v3_role[]) THEN
    RAISE EXCEPTION 'Submitted quality results are locked. A quality manager must reopen them.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_v3_quality_lock BEFORE UPDATE ON public.v3_quality_analyses
  FOR EACH ROW EXECUTE FUNCTION public.v3_lock_submitted_quality();

-- ============ GRNs ============
CREATE TABLE public.v3_grns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT NOT NULL UNIQUE,
  receiving_id UUID NOT NULL REFERENCES public.v3_receiving_records(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.v3_suppliers(id) ON DELETE SET NULL,
  net_weight NUMERIC NOT NULL,
  bags INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  issued_by UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_grns TO authenticated;
GRANT ALL ON public.v3_grns TO service_role;
ALTER TABLE public.v3_grns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_grns_read" ON public.v3_grns FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_grns_write" ON public.v3_grns FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','quality_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','quality_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_grns_updated BEFORE UPDATE ON public.v3_grns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STOCK BATCHES ============
CREATE TABLE public.v3_stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  warehouse TEXT,
  zone TEXT,
  coffee_type TEXT NOT NULL,
  grade TEXT,
  state public.v3_stock_state NOT NULL DEFAULT 'branch_stock',
  bags INTEGER NOT NULL DEFAULT 0,
  kilograms NUMERIC NOT NULL DEFAULT 0,
  available_kilograms NUMERIC NOT NULL DEFAULT 0,
  average_cost NUMERIC,
  source_receiving_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_stock_batches TO authenticated;
GRANT ALL ON public.v3_stock_batches TO service_role;
ALTER TABLE public.v3_stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_stock_read" ON public.v3_stock_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_stock_write" ON public.v3_stock_batches FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','storekeeper','branch_manager','production_manager','export_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','storekeeper','branch_manager','production_manager','export_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_stock_updated BEFORE UPDATE ON public.v3_stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRANSFERS ============
CREATE TABLE public.v3_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,
  from_branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  to_branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.v3_stock_batches(id) ON DELETE SET NULL,
  status public.v3_transfer_status NOT NULL DEFAULT 'awaiting_approval',
  bags INTEGER NOT NULL DEFAULT 0,
  dispatch_weight NUMERIC,
  arrival_weight NUMERIC,
  variance_kg NUMERIC,
  vehicle TEXT,
  driver_name TEXT,
  driver_user_id UUID,
  seal_number TEXT,
  seal_intact BOOLEAN,
  dispatched_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  approved_by UUID,
  received_by UUID,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_transfers TO authenticated;
GRANT ALL ON public.v3_transfers TO service_role;
ALTER TABLE public.v3_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_transfers_read" ON public.v3_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_transfers_write" ON public.v3_transfers FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['logistics_manager','store_manager','branch_manager','driver']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['logistics_manager','store_manager','branch_manager','driver']::public.v3_role[]));
CREATE TRIGGER trg_v3_transfers_updated BEFORE UPDATE ON public.v3_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTION ============
CREATE TABLE public.v3_production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT NOT NULL UNIQUE,
  batch_id UUID REFERENCES public.v3_stock_batches(id) ON DELETE SET NULL,
  machine TEXT,
  operator_id UUID,
  processing_method TEXT,
  input_kg NUMERIC NOT NULL DEFAULT 0,
  confirmed_input_kg NUMERIC,
  output_exportable_kg NUMERIC DEFAULT 0,
  output_black_kg NUMERIC DEFAULT 0,
  output_triage_kg NUMERIC DEFAULT 0,
  output_husks_kg NUMERIC DEFAULT 0,
  output_pods_kg NUMERIC DEFAULT 0,
  output_dust_kg NUMERIC DEFAULT 0,
  moisture_loss_kg NUMERIC DEFAULT 0,
  variance_kg NUMERIC,
  downtime_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  variance_investigation TEXT,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_production_runs TO authenticated;
GRANT ALL ON public.v3_production_runs TO service_role;
ALTER TABLE public.v3_production_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_production_read" ON public.v3_production_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_production_write" ON public.v3_production_runs FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['production_manager','production_operator']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['production_manager','production_operator']::public.v3_role[]));
CREATE TRIGGER trg_v3_production_updated BEFORE UPDATE ON public.v3_production_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTRACTS ============
CREATE TABLE public.v3_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  contract_type TEXT NOT NULL DEFAULT 'buyer',
  counterparty_name TEXT NOT NULL,
  counterparty_country TEXT,
  coffee_type TEXT NOT NULL,
  grade TEXT,
  quality_spec TEXT,
  quantity_kg NUMERIC NOT NULL,
  allocated_kg NUMERIC NOT NULL DEFAULT 0,
  shipped_kg NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  incoterm TEXT,
  payment_terms TEXT,
  delivery_from DATE,
  delivery_to DATE,
  status TEXT NOT NULL DEFAULT 'active',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_contracts TO authenticated;
GRANT ALL ON public.v3_contracts TO service_role;
ALTER TABLE public.v3_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_contracts_read" ON public.v3_contracts FOR SELECT TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager','export_manager','export_officer','finance_manager','managing_director','operations_manager']::public.v3_role[]));
CREATE POLICY "v3_contracts_write" ON public.v3_contracts FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager']::public.v3_role[]));
CREATE TRIGGER trg_v3_contracts_updated BEFORE UPDATE ON public.v3_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v3_contract_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.v3_contracts(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.v3_stock_batches(id) ON DELETE SET NULL,
  kilograms NUMERIC NOT NULL,
  allocated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_contract_allocations TO authenticated;
GRANT ALL ON public.v3_contract_allocations TO service_role;
ALTER TABLE public.v3_contract_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_alloc_read" ON public.v3_contract_allocations FOR SELECT TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager','export_manager','export_officer','store_manager','finance_manager']::public.v3_role[]));
CREATE POLICY "v3_alloc_write" ON public.v3_contract_allocations FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager','export_manager']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['trade_manager','export_manager']::public.v3_role[]));

-- ============ EXPORT SHIPMENTS ============
CREATE TABLE public.v3_export_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL UNIQUE,
  contract_id UUID REFERENCES public.v3_contracts(id) ON DELETE SET NULL,
  status public.v3_shipment_status NOT NULL DEFAULT 'planned',
  coffee_type TEXT,
  grade TEXT,
  planned_kg NUMERIC NOT NULL DEFAULT 0,
  loaded_kg NUMERIC NOT NULL DEFAULT 0,
  bags INTEGER NOT NULL DEFAULT 0,
  container_number TEXT,
  container_tare_kg NUMERIC,
  seal_number TEXT,
  booking_reference TEXT,
  shipping_line TEXT,
  vessel_name TEXT,
  voyage_number TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  destination_country TEXT,
  cutoff_date DATE,
  etd DATE,
  eta DATE,
  customs_reference TEXT,
  customs_status TEXT,
  customs_cleared_at TIMESTAMPTZ,
  fumigation_required BOOLEAN NOT NULL DEFAULT true,
  quality_approved BOOLEAN NOT NULL DEFAULT false,
  quality_approved_by UUID,
  loading_approved_by UUID,
  loading_approved_at TIMESTAMPTZ,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_export_shipments TO authenticated;
GRANT ALL ON public.v3_export_shipments TO service_role;
ALTER TABLE public.v3_export_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_shipments_read" ON public.v3_export_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_shipments_write" ON public.v3_export_shipments FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['export_manager','export_officer']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['export_manager','export_officer']::public.v3_role[]));
CREATE TRIGGER trg_v3_shipments_updated BEFORE UPDATE ON public.v3_export_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v3_export_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.v3_export_shipments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  reference TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  mandatory BOOLEAN NOT NULL DEFAULT true,
  issuing_body TEXT,
  issue_date DATE,
  expiry_date DATE,
  currency TEXT,
  amount NUMERIC,
  file_url TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_export_documents TO authenticated;
GRANT ALL ON public.v3_export_documents TO service_role;
ALTER TABLE public.v3_export_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_exportdocs_read" ON public.v3_export_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_exportdocs_write" ON public.v3_export_documents FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['export_manager','export_officer','compliance_officer']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['export_manager','export_officer','compliance_officer']::public.v3_role[]));
CREATE TRIGGER trg_v3_exportdocs_updated BEFORE UPDATE ON public.v3_export_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYMENTS ============
CREATE TABLE public.v3_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  grn_id UUID REFERENCES public.v3_grns(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.v3_suppliers(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.v3_branches(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  method TEXT NOT NULL DEFAULT 'cash',
  transaction_reference TEXT,
  status public.v3_payment_status NOT NULL DEFAULT 'draft',
  prepared_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grn_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_payments TO authenticated;
GRANT ALL ON public.v3_payments TO service_role;
ALTER TABLE public.v3_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_payments_read" ON public.v3_payments FOR SELECT TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['finance_manager','finance_officer','branch_manager','managing_director','operations_manager','store_manager']::public.v3_role[]));
CREATE POLICY "v3_payments_write" ON public.v3_payments FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['finance_manager','finance_officer']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['finance_manager','finance_officer']::public.v3_role[]));
CREATE TRIGGER trg_v3_payments_updated BEFORE UPDATE ON public.v3_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDIT LOG ============
CREATE TABLE public.v3_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  branch_id UUID,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.v3_audit_log TO authenticated;
GRANT ALL ON public.v3_audit_log TO service_role;
ALTER TABLE public.v3_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_audit_read" ON public.v3_audit_log FOR SELECT TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['managing_director','operations_manager','procurement_it']::public.v3_role[]));
CREATE POLICY "v3_audit_insert" ON public.v3_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_v3_receiving_status ON public.v3_receiving_records(status);
CREATE INDEX idx_v3_receiving_branch ON public.v3_receiving_records(branch_id);
CREATE INDEX idx_v3_stock_state ON public.v3_stock_batches(state);
CREATE INDEX idx_v3_shipment_status ON public.v3_export_shipments(status);
CREATE INDEX idx_v3_audit_entity ON public.v3_audit_log(entity_type, entity_id);