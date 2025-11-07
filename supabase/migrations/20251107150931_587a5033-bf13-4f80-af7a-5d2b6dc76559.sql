-- Rename our_ref column to buyer_ref
ALTER TABLE public.contract_files 
RENAME COLUMN our_ref TO buyer_ref;