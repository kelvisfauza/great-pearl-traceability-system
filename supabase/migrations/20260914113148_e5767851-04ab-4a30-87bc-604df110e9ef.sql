CREATE TABLE IF NOT EXISTS public.trainee_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL UNIQUE,
  employee_email text,
  current_step integer NOT NULL DEFAULT 0,
  completed_steps integer[] NOT NULL DEFAULT '{}',
  total_steps integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.trainee_progress TO authenticated;
GRANT ALL ON public.trainee_progress TO service_role;

ALTER TABLE public.trainee_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainee reads own progress"
ON public.trainee_progress FOR SELECT TO authenticated
USING (
  employee_id::text = public.get_unified_user_id(public.current_user_email())::text
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(public.current_user_email())
      AND (e.role IN ('Super Admin','Administrator','Manager')
           OR 'Human Resources' = ANY(e.permissions)
           OR '*' = ANY(e.permissions))
  )
);

CREATE POLICY "Trainee inserts own progress"
ON public.trainee_progress FOR INSERT TO authenticated
WITH CHECK (employee_id::text = public.get_unified_user_id(public.current_user_email())::text);

CREATE POLICY "Trainee updates own progress"
ON public.trainee_progress FOR UPDATE TO authenticated
USING (employee_id::text = public.get_unified_user_id(public.current_user_email())::text)
WITH CHECK (employee_id::text = public.get_unified_user_id(public.current_user_email())::text);

CREATE TRIGGER trainee_progress_updated_at
BEFORE UPDATE ON public.trainee_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();