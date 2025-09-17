-- Create EUDR documents table with batch support
CREATE TABLE IF NOT EXISTS public.eudr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_type TEXT NOT NULL,
  total_kilograms NUMERIC NOT NULL,
  available_kilograms NUMERIC NOT NULL,
  total_receipts INTEGER NOT NULL DEFAULT 0,
  batch_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'documented' CHECK (status IN ('documented', 'partially_sold', 'sold_out')),
  documentation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create EUDR batches table (5-tonne batches)
CREATE TABLE IF NOT EXISTS public.eudr_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.eudr_documents(id) ON DELETE CASCADE,
  batch_sequence INTEGER NOT NULL, -- 1, 2, 3, etc.
  batch_identifier TEXT NOT NULL, -- EUDR123-BATCH-1, EUDR123-BATCH-2, etc.
  kilograms NUMERIC NOT NULL DEFAULT 5000, -- 5 tonnes per batch
  available_kilograms NUMERIC NOT NULL DEFAULT 5000,
  receipts TEXT[] NOT NULL DEFAULT '{}', -- Array of receipt references for this batch
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'partially_sold', 'sold_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(document_id, batch_sequence)
);

-- Create EUDR sales table with batch tracking
CREATE TABLE IF NOT EXISTS public.eudr_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.eudr_documents(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.eudr_batches(id) ON DELETE CASCADE,
  kilograms NUMERIC NOT NULL,
  sold_to TEXT NOT NULL,
  sale_date DATE NOT NULL,
  sale_price NUMERIC NOT NULL,
  remaining_batch_kilograms NUMERIC NOT NULL,
  batch_identifier TEXT NOT NULL,
  coffee_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eudr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eudr_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eudr_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can manage EUDR documents" ON public.eudr_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage EUDR batches" ON public.eudr_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage EUDR sales" ON public.eudr_sales FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_eudr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eudr_documents_updated_at
  BEFORE UPDATE ON public.eudr_documents
  FOR EACH ROW EXECUTE FUNCTION update_eudr_updated_at();

CREATE TRIGGER update_eudr_batches_updated_at
  BEFORE UPDATE ON public.eudr_batches
  FOR EACH ROW EXECUTE FUNCTION update_eudr_updated_at();

-- Function to automatically create batches when document is created
CREATE OR REPLACE FUNCTION create_eudr_batches()
RETURNS TRIGGER AS $$
DECLARE
  batch_count INTEGER;
  i INTEGER;
  batch_kg NUMERIC;
BEGIN
  -- Calculate number of 5-tonne batches needed
  batch_count := CEIL(NEW.total_kilograms / 5000.0);
  
  FOR i IN 1..batch_count LOOP
    -- Calculate kilograms for this batch (last batch might be less than 5000kg)
    IF i = batch_count THEN
      batch_kg := NEW.total_kilograms - ((i - 1) * 5000);
    ELSE
      batch_kg := 5000;
    END IF;
    
    INSERT INTO public.eudr_batches (
      document_id,
      batch_sequence,
      batch_identifier,
      kilograms,
      available_kilograms
    ) VALUES (
      NEW.id,
      i,
      NEW.batch_number || '-BATCH-' || i,
      batch_kg,
      batch_kg
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_eudr_batches_trigger
  AFTER INSERT ON public.eudr_documents
  FOR EACH ROW EXECUTE FUNCTION create_eudr_batches();

-- Function to update document status when batch status changes
CREATE OR REPLACE FUNCTION update_document_status_from_batches()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  total_available NUMERIC;
  total_capacity NUMERIC;
BEGIN
  -- Get document ID (works for both INSERT and UPDATE)
  doc_id := COALESCE(NEW.document_id, OLD.document_id);
  
  -- Calculate totals for the document
  SELECT 
    SUM(available_kilograms),
    SUM(kilograms)
  INTO total_available, total_capacity
  FROM public.eudr_batches 
  WHERE document_id = doc_id;
  
  -- Update document status and available kilograms
  UPDATE public.eudr_documents 
  SET 
    available_kilograms = total_available,
    status = CASE 
      WHEN total_available = 0 THEN 'sold_out'
      WHEN total_available < total_capacity THEN 'partially_sold'
      ELSE 'documented'
    END,
    updated_at = now()
  WHERE id = doc_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.eudr_batches
  FOR EACH ROW EXECUTE FUNCTION update_document_status_from_batches();