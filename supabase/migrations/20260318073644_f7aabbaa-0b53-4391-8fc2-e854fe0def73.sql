
-- 1. Quality Re-evaluations (Internal Audits)
CREATE TABLE IF NOT EXISTS quality_reevaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_assessment_id UUID REFERENCES quality_assessments(id) ON DELETE CASCADE NOT NULL,
  batch_number TEXT NOT NULL,
  original_moisture NUMERIC,
  original_outturn NUMERIC,
  original_group1 NUMERIC,
  original_group2 NUMERIC,
  original_pods NUMERIC,
  original_husks NUMERIC,
  original_fm NUMERIC,
  new_moisture NUMERIC NOT NULL,
  new_outturn NUMERIC NOT NULL,
  new_group1 NUMERIC DEFAULT 0,
  new_group2 NUMERIC DEFAULT 0,
  new_pods NUMERIC DEFAULT 0,
  new_husks NUMERIC DEFAULT 0,
  new_fm NUMERIC DEFAULT 0,
  moisture_variance NUMERIC GENERATED ALWAYS AS (new_moisture - COALESCE(original_moisture, 0)) STORED,
  outturn_variance NUMERIC GENERATED ALWAYS AS (new_outturn - COALESCE(original_outturn, 0)) STORED,
  comment TEXT,
  evaluated_by TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Calibration Logs
CREATE TABLE IF NOT EXISTS calibration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  expected_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  variance NUMERIC GENERATED ALWAYS AS (actual_value - expected_value) STORED,
  status TEXT NOT NULL DEFAULT 'OK',
  done_by TEXT NOT NULL,
  calibration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Defect Library
CREATE TABLE IF NOT EXISTS defect_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'Medium',
  image_url TEXT,
  added_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Warehouse Quality Monitoring
CREATE TABLE IF NOT EXISTS warehouse_quality_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL,
  storage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_moisture NUMERIC NOT NULL,
  mold_risk TEXT NOT NULL DEFAULT 'Low',
  weight_loss_estimate NUMERIC DEFAULT 0,
  temperature NUMERIC,
  humidity NUMERIC,
  remarks TEXT,
  monitored_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Quality Recommendations
CREATE TABLE IF NOT EXISTS quality_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  issue_identified TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  expected_impact TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  submitted_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Training Simulations
CREATE TABLE IF NOT EXISTS training_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_email TEXT NOT NULL,
  trainee_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  coffee_type TEXT NOT NULL DEFAULT 'Robusta',
  simulated_moisture NUMERIC NOT NULL,
  simulated_outturn NUMERIC NOT NULL,
  simulated_defects JSONB DEFAULT '{}',
  trainee_decision TEXT,
  trainee_price NUMERIC,
  correct_decision TEXT,
  correct_price NUMERIC,
  is_correct BOOLEAN,
  score NUMERIC,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Quality Daily Checklists
CREATE TABLE IF NOT EXISTS quality_daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  checklist_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calibration_done BOOLEAN DEFAULT FALSE,
  batch_reviews_count INTEGER DEFAULT 0,
  daily_report_submitted BOOLEAN DEFAULT FALSE,
  supplier_analysis_updated BOOLEAN DEFAULT FALSE,
  reevaluations_count INTEGER DEFAULT 0,
  completion_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_email, checklist_date)
);

-- 8. Quality Performance Tracking
CREATE TABLE IF NOT EXISTS quality_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  assessments_count INTEGER DEFAULT 0,
  reevaluations_count INTEGER DEFAULT 0,
  reports_submitted INTEGER DEFAULT 0,
  issues_flagged INTEGER DEFAULT 0,
  accuracy_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE quality_reevaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_quality_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_performance_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view quality_reevaluations" ON quality_reevaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quality_reevaluations" ON quality_reevaluations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view calibration_logs" ON calibration_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert calibration_logs" ON calibration_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view defect_library" ON defect_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert defect_library" ON defect_library FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update defect_library" ON defect_library FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view warehouse_quality_monitoring" ON warehouse_quality_monitoring FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert warehouse_quality_monitoring" ON warehouse_quality_monitoring FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view quality_recommendations" ON quality_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quality_recommendations" ON quality_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quality_recommendations" ON quality_recommendations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view training_simulations" ON training_simulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert training_simulations" ON training_simulations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update training_simulations" ON training_simulations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view quality_daily_checklists" ON quality_daily_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quality_daily_checklists" ON quality_daily_checklists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quality_daily_checklists" ON quality_daily_checklists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view quality_performance_tracking" ON quality_performance_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quality_performance_tracking" ON quality_performance_tracking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quality_performance_tracking" ON quality_performance_tracking FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
