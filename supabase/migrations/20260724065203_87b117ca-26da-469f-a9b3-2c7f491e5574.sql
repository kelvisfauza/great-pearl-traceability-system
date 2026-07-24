SELECT
  e.name,
  e.email,
  COALESCE(SUM(le.amount),0) AS ledger_wallet_balance,
  oa.outstanding_balance AS overdraft_snapshot,
  oa.total_interest
FROM public.employees e
LEFT JOIN public.ledger_entries le ON le.user_id::text = e.id::text
LEFT JOIN public.overdraft_accounts oa ON oa.user_id::text = e.id::text AND oa.status='active'
WHERE e.id::text IN ('7cdf79bf-c024-4107-98a7-3d84dbf0e975','e400bc7b-be01-4654-b9b7-7f30334e87e8')
GROUP BY e.name, e.email, oa.outstanding_balance, oa.total_interest
ORDER BY e.name;