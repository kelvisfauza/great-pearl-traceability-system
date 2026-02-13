
-- Create time deductions table
CREATE TABLE public.time_deductions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    employee_phone TEXT,
    month TEXT NOT NULL, -- Format: YYYY-MM
    hours_missed NUMERIC NOT NULL DEFAULT 0,
    rate_per_hour NUMERIC NOT NULL DEFAULT 3000,
    total_deduction NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    sms_sent BOOLEAN DEFAULT false,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(employee_id, month)
);

-- Enable RLS
ALTER TABLE public.time_deductions ENABLE ROW LEVEL SECURITY;

-- Policies - admins and HR can manage
CREATE POLICY "Authenticated users can view time deductions"
ON public.time_deductions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert time deductions"
ON public.time_deductions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update time deductions"
ON public.time_deductions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete time deductions"
ON public.time_deductions FOR DELETE TO authenticated USING (true);
