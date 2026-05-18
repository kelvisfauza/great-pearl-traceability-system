CREATE OR REPLACE FUNCTION public.get_pending_wallet_commitments(p_user_id text, p_user_email text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH legacy_pending AS (
    SELECT COALESCE(SUM(wr.amount), 0) AS amount
    FROM public.withdrawal_requests wr
    WHERE wr.user_id::text = p_user_id
      AND LOWER(COALESCE(wr.status, '')) IN (
        'pending','processing','pending_approval','pending_admin',
        'pending_admin_2','pending_admin_3','pending_finance'
      )
  ),
  approval_pending AS (
    SELECT COALESCE(SUM(ar.amount), 0) AS amount
    FROM public.approval_requests ar
    WHERE LOWER(COALESCE(ar.type, '')) LIKE '%withdraw%'
      AND (
        LOWER(COALESCE(ar.status, '')) LIKE 'pending%'
        OR LOWER(COALESCE(ar.status, '')) = 'processing'
      )
      -- Exclude terminal statuses even if approval_stage is stale
      AND LOWER(COALESCE(ar.status, '')) NOT IN (
        'fully_approved','approved','rejected','denied','paid','completed',
        'cancelled','canceled','disbursed','closed','expired','failed','reversed'
      )
      AND (
        COALESCE(ar.details->>'user_id', '') = p_user_id
        OR (
          p_user_email IS NOT NULL
          AND LOWER(COALESCE(ar.requestedby, '')) = LOWER(p_user_email)
        )
      )
  )
  SELECT COALESCE((SELECT amount FROM legacy_pending), 0)
       + COALESCE((SELECT amount FROM approval_pending), 0);
$function$;