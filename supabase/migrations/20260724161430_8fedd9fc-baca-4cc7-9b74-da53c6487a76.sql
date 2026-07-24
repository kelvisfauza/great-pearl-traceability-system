
CREATE TABLE IF NOT EXISTS public.admin_wallet_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('credit','debit','transfer','withdraw')),
  target_user_id text NOT NULL,
  target_email text NOT NULL,
  target_name text,
  target_phone text,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  -- transfer
  destination_user_id text,
  destination_email text,
  destination_name text,
  -- withdraw
  destination_phone text,
  payout_provider text CHECK (payout_provider IN ('gosentepay','yo','cash') OR payout_provider IS NULL),
  service_fee numeric NOT NULL DEFAULT 0,
  overdraft_access_fee numeric NOT NULL DEFAULT 0,
  allow_overdraft boolean NOT NULL DEFAULT false,
  -- workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','failed','cancelled')),
  initiated_by uuid NOT NULL,
  initiated_by_email text NOT NULL,
  initiated_by_name text,
  approved_by uuid,
  approved_by_email text,
  approved_by_name text,
  approved_at timestamptz,
  rejected_reason text,
  executed_at timestamptz,
  execution_error text,
  ledger_reference text,
  gateway_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_wallet_operations TO authenticated;
GRANT ALL ON public.admin_wallet_operations TO service_role;

ALTER TABLE public.admin_wallet_operations ENABLE ROW LEVEL SECURITY;

-- Admins (has 'Administrator' or 'Super Admin' role) can view / insert / update.
CREATE POLICY "Admins view admin wallet ops"
  ON public.admin_wallet_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin','super_admin','Administrator','Super Admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.email = (auth.jwt() ->> 'email')
        AND e.role IN ('Administrator','Super Admin')
    )
  );

CREATE POLICY "Admins create admin wallet ops"
  ON public.admin_wallet_operations FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.email = (auth.jwt() ->> 'email')
          AND e.role IN ('Administrator','Super Admin')
      )
    )
  );

CREATE POLICY "Admins update admin wallet ops"
  ON public.admin_wallet_operations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.email = (auth.jwt() ->> 'email')
        AND e.role IN ('Administrator','Super Admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_wallet_ops_status ON public.admin_wallet_operations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_wallet_ops_target ON public.admin_wallet_operations(target_user_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_admin_wallet_ops_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_admin_wallet_ops_updated_at ON public.admin_wallet_operations;
CREATE TRIGGER trg_admin_wallet_ops_updated_at
  BEFORE UPDATE ON public.admin_wallet_operations
  FOR EACH ROW EXECUTE FUNCTION public.tg_admin_wallet_ops_updated_at();
