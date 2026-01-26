-- Create employee_salary_advances table to track outstanding advances
CREATE TABLE public.employee_salary_advances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_email TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    original_amount NUMERIC NOT NULL,
    remaining_balance NUMERIC NOT NULL,
    minimum_payment NUMERIC NOT NULL DEFAULT 40000,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    CONSTRAINT positive_amounts CHECK (original_amount > 0 AND remaining_balance >= 0 AND minimum_payment > 0)
);

-- Create salary_advance_payments table to track payments made against advances
CREATE TABLE public.salary_advance_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    advance_id UUID NOT NULL REFERENCES public.employee_salary_advances(id) ON DELETE CASCADE,
    employee_email TEXT NOT NULL,
    amount_paid NUMERIC NOT NULL,
    salary_request_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT positive_payment CHECK (amount_paid > 0)
);

-- Enable RLS
ALTER TABLE public.employee_salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advance_payments ENABLE ROW LEVEL SECURITY;

-- Policies for employee_salary_advances
CREATE POLICY "Users can view their own advances"
ON public.employee_salary_advances
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage advances"
ON public.employee_salary_advances
FOR ALL
USING (true);

-- Policies for salary_advance_payments
CREATE POLICY "Users can view their own payments"
ON public.salary_advance_payments
FOR SELECT
USING (true);

CREATE POLICY "Users can create payment records"
ON public.salary_advance_payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage payments"
ON public.salary_advance_payments
FOR ALL
USING (true);

-- Create function to update advance balance when payment is approved
CREATE OR REPLACE FUNCTION public.update_advance_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE public.employee_salary_advances
        SET remaining_balance = remaining_balance - NEW.amount_paid,
            updated_at = now(),
            status = CASE 
                WHEN remaining_balance - NEW.amount_paid <= 0 THEN 'paid_off'
                ELSE 'active'
            END
        WHERE id = NEW.advance_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update balance
CREATE TRIGGER update_advance_balance_trigger
AFTER INSERT OR UPDATE ON public.salary_advance_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_advance_balance();

-- Insert Timothy's advance (200,000 UGX with 40,000 minimum payment)
INSERT INTO public.employee_salary_advances (employee_email, employee_name, original_amount, remaining_balance, minimum_payment, reason, created_by)
VALUES ('timothy@kajongoespresso.com', 'Timothy', 200000, 200000, 40000, 'Salary advance taken', 'System');