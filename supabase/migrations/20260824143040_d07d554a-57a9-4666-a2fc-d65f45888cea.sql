CREATE TABLE public.admin_approval_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  requested_by uuid NOT NULL,
  requested_by_email text,
  code_hash text NOT NULL,
  phone text,
  amount numeric,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_approval_codes TO authenticated;
GRANT ALL ON public.admin_approval_codes TO service_role;

ALTER TABLE public.admin_approval_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own approval code requests"
ON public.admin_approval_codes
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

CREATE INDEX idx_admin_approval_codes_target ON public.admin_approval_codes (target_type, target_id, created_at DESC);

CREATE TRIGGER trg_admin_approval_codes_updated_at
BEFORE UPDATE ON public.admin_approval_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();