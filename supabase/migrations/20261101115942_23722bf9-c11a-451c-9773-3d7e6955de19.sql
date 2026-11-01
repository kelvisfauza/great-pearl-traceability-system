ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

UPDATE public.ledger_entries
SET is_hidden = true
WHERE id IN (
  '40bf32f4-c7fb-4d29-9fe6-086807c89364',
  'a43ff869-4a9e-4ce0-a42a-87e0cd6bd01a'
);