
CREATE TABLE IF NOT EXISTS public.generated_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  source text NOT NULL,
  source_id text,
  storage_bucket text NOT NULL DEFAULT 'payment-receipts',
  storage_path text NOT NULL,
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  amount numeric,
  charges numeric,
  total numeric,
  payment_method text,
  transaction_id text,
  processed_by text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.generated_receipts TO authenticated;
GRANT ALL ON public.generated_receipts TO service_role;

ALTER TABLE public.generated_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins & finance read all receipts"
  ON public.generated_receipts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

CREATE INDEX IF NOT EXISTS generated_receipts_reference_idx ON public.generated_receipts (reference);
CREATE INDEX IF NOT EXISTS generated_receipts_source_idx ON public.generated_receipts (source, source_id);
CREATE INDEX IF NOT EXISTS generated_receipts_created_idx ON public.generated_receipts (created_at DESC);

INSERT INTO public.generated_receipts (reference, source, storage_bucket, storage_path, metadata)
VALUES ('RCP-20260720-KHBPV', 'backfill_storage_scan', 'payment-receipts', '2026/RCP-20260720-KHBPV.pdf',
        jsonb_build_object('note', 'Backfilled from storage; original submission link unknown'))
ON CONFLICT (reference) DO NOTHING;
