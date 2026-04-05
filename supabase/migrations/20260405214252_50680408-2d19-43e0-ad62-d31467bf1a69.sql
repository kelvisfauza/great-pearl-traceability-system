
CREATE TABLE public.employee_of_the_month (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_avatar_url TEXT,
  department TEXT,
  position TEXT,
  rank INTEGER NOT NULL DEFAULT 1,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  reason TEXT,
  bonus_amount NUMERIC DEFAULT 0,
  bonus_awarded BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  email_scheduled_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.employee_of_the_month ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view employee of the month"
  ON public.employee_of_the_month FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage employee of the month"
  ON public.employee_of_the_month FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.email = (SELECT auth.jwt() ->> 'email') 
      AND e.role IN ('Super Admin', 'Manager', 'Administrator')
    )
  );

CREATE POLICY "Admins can update employee of the month"
  ON public.employee_of_the_month FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.email = (SELECT auth.jwt() ->> 'email') 
      AND e.role IN ('Super Admin', 'Manager', 'Administrator')
    )
  );

CREATE POLICY "Admins can delete employee of the month"
  ON public.employee_of_the_month FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.email = (SELECT auth.jwt() ->> 'email') 
      AND e.role IN ('Super Admin', 'Manager', 'Administrator')
    )
  );
