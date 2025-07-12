
-- Create daily_tasks table to track all finance operations
CREATE TABLE public.daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL,
  batch_number TEXT,
  completed_by TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  department TEXT NOT NULL DEFAULT 'Finance',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view daily_tasks" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert daily_tasks" ON public.daily_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update daily_tasks" ON public.daily_tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete daily_tasks" ON public.daily_tasks FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_daily_tasks_date ON public.daily_tasks(date);
CREATE INDEX idx_daily_tasks_type ON public.daily_tasks(task_type);
CREATE INDEX idx_daily_tasks_completed_by ON public.daily_tasks(completed_by);
