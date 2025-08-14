-- Create employees table with proper permissions and roles
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    salary DECIMAL(10,2) DEFAULT 0,
    role TEXT DEFAULT 'User',
    permissions TEXT[] DEFAULT ARRAY['General Access'],
    status TEXT DEFAULT 'Active',
    join_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_one_time_password BOOLEAN DEFAULT false,
    must_change_password BOOLEAN DEFAULT false,
    auth_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Employees can view all profiles" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE auth_user_id = auth.uid() 
        AND (role = 'Administrator' OR 'Human Resources' = ANY(permissions))
    )
);

CREATE POLICY "Admins can update employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE auth_user_id = auth.uid() 
        AND (role = 'Administrator' OR 'Human Resources' = ANY(permissions))
    )
);

CREATE POLICY "Admins can delete employees" 
ON public.employees 
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Administrator'
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();