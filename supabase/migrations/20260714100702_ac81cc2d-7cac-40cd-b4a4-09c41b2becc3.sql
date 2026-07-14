UPDATE public.overdraft_accounts oa
SET outstanding_balance = GREATEST(0, -COALESCE(w.bal, 0)),
    updated_at = now()
FROM (
  SELECT user_id::text AS uid, SUM(amount)::numeric AS bal
  FROM public.ledger_entries
  GROUP BY user_id
) w
WHERE oa.user_id::text = w.uid
  AND oa.status = 'active';

CREATE OR REPLACE FUNCTION public.sync_overdraft_outstanding_from_wallet(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_bal
  FROM public.ledger_entries WHERE user_id::text = p_user_id::text;

  UPDATE public.overdraft_accounts
  SET outstanding_balance = GREATEST(0, -v_bal),
      updated_at = now()
  WHERE user_id::text = p_user_id::text AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_overdraft_outstanding_from_wallet(uuid) TO authenticated, service_role;