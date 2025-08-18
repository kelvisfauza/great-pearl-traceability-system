-- Create store_records table for inventory management (if not exists)
CREATE TABLE IF NOT EXISTS public.store_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_item_id UUID REFERENCES public.inventory_items(id),
    transaction_type TEXT NOT NULL DEFAULT 'received',
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
    status TEXT NOT NULL DEFAULT 'active'
);

-- Create edit_requests table for transaction modifications (if not exists)
CREATE TABLE IF NOT EXISTS public.edit_requests (
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
    status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_records' AND policyname = 'Anyone can view store records'
    ) THEN
        ALTER TABLE public.store_records ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can view store records" ON public.store_records
        FOR SELECT USING (true);
        
        CREATE POLICY "Anyone can insert store records" ON public.store_records
        FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Anyone can update store records" ON public.store_records
        FOR UPDATE USING (true);
        
        CREATE POLICY "Only admins can delete store records" ON public.store_records
        FOR DELETE USING (is_current_user_admin());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'edit_requests' AND policyname = 'Anyone can view edit requests'
    ) THEN
        ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can view edit requests" ON public.edit_requests
        FOR SELECT USING (true);
        
        CREATE POLICY "Anyone can create edit requests" ON public.edit_requests
        FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Only admins can update edit requests" ON public.edit_requests
        FOR UPDATE USING (is_current_user_admin());
    END IF;
END $$;