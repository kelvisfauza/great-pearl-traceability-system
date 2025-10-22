-- Create attendance tracking table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, leave
  marked_by TEXT NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create weekly allowances table to track what users can request
CREATE TABLE IF NOT EXISTS public.weekly_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  days_attended INTEGER DEFAULT 0,
  total_eligible_amount NUMERIC DEFAULT 0,
  amount_requested NUMERIC DEFAULT 0,
  balance_available NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_allowances ENABLE ROW LEVEL SECURITY;

-- Attendance policies
CREATE POLICY "Anyone can view attendance"
  ON public.attendance FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage attendance"
  ON public.attendance FOR ALL
  USING (true)
  WITH CHECK (true);

-- Weekly allowances policies
CREATE POLICY "Users can view their own allowances"
  ON public.weekly_allowances FOR SELECT
  USING (true);

CREATE POLICY "System can manage allowances"
  ON public.weekly_allowances FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to calculate weekly allowances
CREATE OR REPLACE FUNCTION calculate_weekly_allowance()
RETURNS TRIGGER AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  days_count INTEGER;
  daily_rate NUMERIC := 2500; -- 15000 / 6 days
BEGIN
  -- Get the week start (Monday) and end (Saturday) for the attendance date
  week_start := DATE_TRUNC('week', NEW.date)::DATE;
  week_end := week_start + INTERVAL '5 days'; -- Monday to Saturday
  
  -- Count present days for this employee in this week
  SELECT COUNT(*)
  INTO days_count
  FROM attendance
  WHERE employee_id = NEW.employee_id
    AND date >= week_start
    AND date <= week_end
    AND status = 'present';
  
  -- Insert or update weekly allowance
  INSERT INTO weekly_allowances (
    employee_id,
    employee_name,
    employee_email,
    week_start_date,
    week_end_date,
    days_attended,
    total_eligible_amount,
    balance_available,
    updated_at
  )
  VALUES (
    NEW.employee_id,
    NEW.employee_name,
    NEW.employee_email,
    week_start,
    week_end,
    days_count,
    days_count * daily_rate,
    days_count * daily_rate,
    now()
  )
  ON CONFLICT (employee_id, week_start_date)
  DO UPDATE SET
    days_attended = days_count,
    total_eligible_amount = days_count * daily_rate,
    balance_available = weekly_allowances.total_eligible_amount - weekly_allowances.amount_requested,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate allowances when attendance is marked
CREATE TRIGGER update_weekly_allowance_trigger
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION calculate_weekly_allowance();