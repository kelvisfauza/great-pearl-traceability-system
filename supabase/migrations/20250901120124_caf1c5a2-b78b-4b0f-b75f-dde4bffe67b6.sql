-- Create milling_expenses table
CREATE TABLE public.milling_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Operating Expense',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Approved',
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.milling_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can manage milling_expenses" 
ON public.milling_expenses 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_milling_expenses_updated_at
BEFORE UPDATE ON public.milling_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_milling_updated_at_column();