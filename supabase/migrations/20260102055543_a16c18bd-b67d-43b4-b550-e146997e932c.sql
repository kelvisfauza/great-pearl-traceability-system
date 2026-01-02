-- Add EUDR tracing fields to inventory_batch_sources (per receipt/transaction level)
ALTER TABLE public.inventory_batch_sources 
ADD COLUMN IF NOT EXISTS eudr_traced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eudr_traced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS eudr_document_id UUID REFERENCES public.eudr_documents(id),
ADD COLUMN IF NOT EXISTS eudr_batch_id UUID REFERENCES public.eudr_batches(id);

-- Create index for faster EUDR queries
CREATE INDEX IF NOT EXISTS idx_inventory_batch_sources_eudr_traced 
ON public.inventory_batch_sources(eudr_traced) WHERE eudr_traced = true;

-- Create index for document lookups
CREATE INDEX IF NOT EXISTS idx_inventory_batch_sources_eudr_document 
ON public.inventory_batch_sources(eudr_document_id) WHERE eudr_document_id IS NOT NULL;