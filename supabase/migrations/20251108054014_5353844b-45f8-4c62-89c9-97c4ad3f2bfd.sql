-- Create field_agents table
CREATE TABLE IF NOT EXISTS public.field_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  district_assigned TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create farmer_profiles table
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  village TEXT NOT NULL,
  parish TEXT,
  subcounty TEXT,
  coffee_type TEXT NOT NULL CHECK (coffee_type IN ('Arabica', 'Robusta', 'Both')),
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  photo_url TEXT,
  id_photo_url TEXT,
  notes TEXT,
  total_purchases_kg NUMERIC DEFAULT 0,
  outstanding_advance NUMERIC DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create field_purchases table
CREATE TABLE IF NOT EXISTS public.field_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES public.farmer_profiles(id),
  farmer_name TEXT NOT NULL,
  coffee_type TEXT NOT NULL CHECK (coffee_type IN ('Arabica', 'Robusta')),
  category TEXT NOT NULL,
  kgs_purchased NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  advance_deducted NUMERIC DEFAULT 0,
  quality_notes TEXT,
  moisture_percentage NUMERIC,
  image_url TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  purchase_date DATE DEFAULT CURRENT_DATE,
  delivery_slip_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Pending Delivery',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rejected_coffee table
CREATE TABLE IF NOT EXISTS public.rejected_coffee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES public.farmer_profiles(id),
  farmer_name TEXT NOT NULL,
  kgs_rejected NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  photo_url TEXT,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('Destroyed', 'Returned', 'Resold')),
  notes TEXT,
  rejected_date DATE DEFAULT CURRENT_DATE,
  reported_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE DEFAULT CURRENT_DATE,
  district TEXT NOT NULL,
  villages_visited TEXT NOT NULL,
  farmers_visited TEXT[],
  total_kgs_mobilized NUMERIC NOT NULL DEFAULT 0,
  challenges TEXT,
  actions_needed TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create weekly_reports table
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_kgs_sourced NUMERIC NOT NULL DEFAULT 0,
  total_farmers_visited INTEGER NOT NULL DEFAULT 0,
  total_rejected_coffee NUMERIC DEFAULT 0,
  facilitation_used NUMERIC DEFAULT 0,
  management_issues TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create facilitation_requests table
CREATE TABLE IF NOT EXISTS public.facilitation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('Airtime', 'Data', 'Fuel', 'Transport', 'Other')),
  amount_requested NUMERIC NOT NULL,
  purpose TEXT NOT NULL,
  date_needed DATE NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create field_attendance_logs table
CREATE TABLE IF NOT EXISTS public.field_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_agent TEXT NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  check_in_gps_latitude NUMERIC,
  check_in_gps_longitude NUMERIC,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_out_gps_latitude NUMERIC,
  check_out_gps_longitude NUMERIC,
  duration_minutes INTEGER,
  location_name TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejected_coffee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view field_agents" ON public.field_agents FOR SELECT USING (true);
CREATE POLICY "Admins can manage field_agents" ON public.field_agents FOR ALL USING (is_current_user_admin());

CREATE POLICY "Anyone can view farmer_profiles" ON public.farmer_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert farmer_profiles" ON public.farmer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update farmer_profiles" ON public.farmer_profiles FOR UPDATE USING (true);

CREATE POLICY "Anyone can view field_purchases" ON public.field_purchases FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert field_purchases" ON public.field_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update field_purchases" ON public.field_purchases FOR UPDATE USING (true);

CREATE POLICY "Anyone can view rejected_coffee" ON public.rejected_coffee FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert rejected_coffee" ON public.rejected_coffee FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view daily_reports" ON public.daily_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert daily_reports" ON public.daily_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view weekly_reports" ON public.weekly_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert weekly_reports" ON public.weekly_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view facilitation_requests" ON public.facilitation_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert facilitation_requests" ON public.facilitation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update facilitation_requests" ON public.facilitation_requests FOR UPDATE USING (is_current_user_admin());

CREATE POLICY "Anyone can view field_attendance_logs" ON public.field_attendance_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert field_attendance_logs" ON public.field_attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update field_attendance_logs" ON public.field_attendance_logs FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_farmer_profiles_phone ON public.farmer_profiles(phone);
CREATE INDEX idx_farmer_profiles_village ON public.farmer_profiles(village);
CREATE INDEX idx_field_purchases_farmer ON public.field_purchases(farmer_id);
CREATE INDEX idx_field_purchases_date ON public.field_purchases(purchase_date);
CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX idx_weekly_reports_dates ON public.weekly_reports(week_start_date, week_end_date);
CREATE INDEX idx_facilitation_requests_status ON public.facilitation_requests(status);
CREATE INDEX idx_field_attendance_date ON public.field_attendance_logs(date);