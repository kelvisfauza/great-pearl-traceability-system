CREATE TABLE public.daily_finance_report_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_date date NOT NULL, cutoff_at timestamptz NOT NULL, is_test boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'preparing', snapshot jsonb NOT NULL, storage_path text, verification_code text NOT NULL, email_result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(report_date,cutoff_at,is_test)
);
REVOKE ALL ON public.daily_finance_report_runs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.daily_finance_report_runs TO service_role;
ALTER TABLE public.daily_finance_report_runs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.daily_finance_snapshot(p_start timestamptz,p_end timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
SELECT jsonb_build_object(
 'captured_at',now(),'start',p_start,'end',p_end,
 'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('code',a.code,'name',a.name,'opening',a.balance-COALESCE((SELECT sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END) FROM treasury_account_entries e WHERE e.account_code=a.code AND e.created_at>=p_start),0),'closing',a.balance-COALESCE((SELECT sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END) FROM treasury_account_entries e WHERE e.account_code=a.code AND e.created_at>=p_end),0),'credits',COALESCE((SELECT sum(e.amount) FROM treasury_account_entries e WHERE e.account_code=a.code AND e.created_at>=p_start AND e.created_at<p_end AND e.direction='credit'),0),'debits',COALESCE((SELECT sum(e.amount) FROM treasury_account_entries e WHERE e.account_code=a.code AND e.created_at>=p_start AND e.created_at<p_end AND e.direction='debit'),0)) ORDER BY a.sort_order) FROM treasury_accounts a),'[]'::jsonb),
 'account_entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM treasury_account_entries e WHERE e.created_at>=p_start AND e.created_at<p_end),'[]'::jsonb),
 'pool_entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM treasury_pool_entries e WHERE e.created_at>=p_start AND e.created_at<p_end),'[]'::jsonb),
 'gosente_observation',(SELECT to_jsonb(g) FROM gosentepay_balance_log g WHERE g.created_at<p_end ORDER BY g.created_at DESC LIMIT 1),
 'yo_observation',(SELECT jsonb_build_object('balance',e.metadata->'yo_balance','recorded_at',e.created_at,'description',e.description,'metadata',e.metadata) FROM treasury_pool_entries e WHERE e.category='reconciliation' AND e.created_at<p_end ORDER BY e.created_at DESC LIMIT 1),
 'receipts',COALESCE((SELECT jsonb_agg(jsonb_build_object('reference',r.reference,'source',r.source,'recipient_name',r.recipient_name,'amount',r.amount,'charges',r.charges,'total',r.total,'payment_method',r.payment_method,'transaction_id',r.transaction_id,'processed_by',r.processed_by,'created_at',r.created_at) ORDER BY r.created_at,r.id) FROM generated_receipts r WHERE r.created_at>=p_start AND r.created_at<p_end),'[]'::jsonb),
 'cash_entries',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at,c.id) FROM finance_cash_transactions c WHERE c.created_at>=p_start AND c.created_at<p_end),'[]'::jsonb),
 'expenses',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM finance_expenses e WHERE e.date=(p_start AT TIME ZONE 'Africa/Kampala')::date),'[]'::jsonb),
 'partial_payments_current',COALESCE((SELECT jsonb_agg(jsonb_build_object('title',p.title,'payee_name',p.payee_name,'total_amount',p.total_amount,'paid_amount',p.paid_amount,'balance',p.balance,'status',p.status,'updated_at',p.updated_at) ORDER BY p.updated_at DESC) FROM partial_payments p WHERE p.balance>0 AND lower(p.status) NOT IN ('rejected','cancelled','completed')),'[]'::jsonb),
 'coffee_payments_current',COALESCE((SELECT jsonb_agg(jsonb_build_object('batch_number',l.batch_number,'grn_number',l.grn_number,'total_amount',l.total_amount_ugx,'paid',l.amount_paid_ugx,'advance_recovered',l.advance_recovered_ugx,'balance',l.balance_ugx,'status',l.payment_status,'updated_at',l.updated_at) ORDER BY l.updated_at DESC) FROM finance_coffee_lots l WHERE l.balance_ugx>0 AND lower(COALESCE(l.payment_status,'')) NOT IN ('rejected','cancelled')),'[]'::jsonb)
) WHERE p_end>p_start AND p_end<=now();
$$;
REVOKE ALL ON FUNCTION public.daily_finance_snapshot(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.daily_finance_snapshot(timestamptz,timestamptz) TO service_role;