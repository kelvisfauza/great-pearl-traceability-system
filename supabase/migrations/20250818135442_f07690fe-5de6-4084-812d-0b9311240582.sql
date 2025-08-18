-- Create store_records table for inventory management
CREATE TABLE public.store_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_item_id UUID REFERENCES public.inventory_items(id),
    transaction_type TEXT NOT NULL DEFAULT 'received', -- 'received', 'dispatched', 'transferred', 'adjusted'
    quantity_bags INTEGER NOT NULL DEFAULT 0,
    quantity_kg NUMERIC NOT NULL DEFAULT 0,
    batch_number TEXT,
    supplier_name TEXT,
    buyer_name TEXT,
    price_per_kg NUMERIC,
    total_value NUMERIC,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_location TEXT,
    to_location TEXT,
    reference_number TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' -- 'active', 'pending_deletion', 'pending_edit'
);

-- Enable RLS on store_records
ALTER TABLE public.store_records ENABLE ROW LEVEL SECURITY;

-- Create policies for store_records
CREATE POLICY "Anyone can view store records" ON public.store_records
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert store records" ON public.store_records
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update store records" ON public.store_records
FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete store records" ON public.store_records
FOR DELETE USING (is_current_user_admin());

-- Create deletion_requests table
CREATE TABLE public.deletion_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    record_data JSONB NOT NULL,
    reason TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_by_department TEXT NOT NULL DEFAULT 'Store',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
);

-- Enable RLS on deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for deletion_requests
CREATE POLICY "Anyone can view deletion requests" ON public.deletion_requests
FOR SELECT USING (true);

CREATE POLICY "Anyone can create deletion requests" ON public.deletion_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update deletion requests" ON public.deletion_requests
FOR UPDATE USING (is_current_user_admin());

-- Create edit_requests table for transaction modifications
CREATE TABLE public.edit_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    original_data JSONB NOT NULL,
    proposed_changes JSONB NOT NULL,
    reason TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_by_department TEXT NOT NULL DEFAULT 'Store',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
);

-- Enable RLS on edit_requests
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for edit_requests
CREATE POLICY "Anyone can view edit requests" ON public.edit_requests
FOR SELECT USING (true);

CREATE POLICY "Anyone can create edit requests" ON public.edit_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update edit requests" ON public.edit_requests
FOR UPDATE USING (is_current_user_admin());

-- Create trigger for store_records updated_at
CREATE TRIGGER update_store_records_updated_at
    BEFORE UPDATE ON public.store_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for deletion_requests updated_at
CREATE TRIGGER update_deletion_requests_updated_at
    BEFORE UPDATE ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for edit_requests updated_at
CREATE TRIGGER update_edit_requests_updated_at
    BEFORE UPDATE ON public.edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();