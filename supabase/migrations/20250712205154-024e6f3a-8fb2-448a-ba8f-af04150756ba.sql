
-- Create finance_transactions table
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Receipt', 'Payment', 'Expense', 'Float')),
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  time TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finance_expenses table
CREATE TABLE public.finance_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_records table
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Processing')),
  date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'Bank Transfer' CHECK (method IN ('Bank Transfer', 'Cash')),
  quality_assessment_id UUID REFERENCES public.quality_assessments(id) ON DELETE CASCADE,
  batch_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view finance_transactions" ON public.finance_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert finance_transactions" ON public.finance_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update finance_transactions" ON public.finance_transactions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete finance_transactions" ON public.finance_transactions FOR DELETE USING (true);

CREATE POLICY "Anyone can view finance_expenses" ON public.finance_expenses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert finance_expenses" ON public.finance_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update finance_expenses" ON public.finance_expenses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete finance_expenses" ON public.finance_expenses FOR DELETE USING (true);

CREATE POLICY "Anyone can view payment_records" ON public.payment_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payment_records" ON public.payment_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payment_records" ON public.payment_records FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete payment_records" ON public.payment_records FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_finance_transactions_type ON public.finance_transactions(type);
CREATE INDEX idx_finance_transactions_date ON public.finance_transactions(date);
CREATE INDEX idx_finance_expenses_status ON public.finance_expenses(status);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);
CREATE INDEX idx_payment_records_quality_assessment_id ON public.payment_records(quality_assessment_id);
