DO $migration$
DECLARE d text; old_part text; new_part text;
BEGIN
 SELECT pg_get_functiondef('public.daily_finance_snapshot(timestamptz,timestamptz)'::regprocedure) INTO d;
 old_part := $old$'account_entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM treasury_account_entries e WHERE e.created_at>=p_start AND e.created_at<p_end),'[]'::jsonb)$old$;
 new_part := $new$'account_entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object('report_category', CASE WHEN e.metadata->>'kind'='provider_fee' THEN 'provider_fee' ELSE COALESCE((SELECT r.request_type FROM provider_submission_requests r WHERE r.id::text=e.metadata->>'provider_submission_id'),e.metadata->>'request_type',CASE WHEN e.metadata ? 'service_provider_payment_id' THEN 'service_provider' END) END) ORDER BY e.created_at,e.id) FROM treasury_account_entries e WHERE e.created_at>=p_start AND e.created_at<p_end),'[]'::jsonb)$new$;
 IF position(old_part IN d)=0 THEN RAISE EXCEPTION 'Account snapshot definition changed; no update applied'; END IF;
 d:=replace(d,old_part,new_part);
 old_part := ') WHERE p_end>p_start AND p_end<=now();';
 new_part := $new$) || jsonb_build_object('profit_loss',(
 WITH lines AS (
 SELECT l.debit,l.credit,l.journal_entry_id,
 lower(a.account_type) AS account_type,
 lower(replace(replace(COALESCE(a.category,''),' ','_'),'-','_')) AS category
 FROM journal_entries j JOIN journal_entry_lines l ON l.journal_entry_id=j.id
 LEFT JOIN chart_of_accounts a ON a.id=l.account_id
 WHERE j.entry_date >= (p_start AT TIME ZONE 'Africa/Kampala')::date
 AND j.entry_date <= ((p_end-interval '1 microsecond') AT TIME ZONE 'Africa/Kampala')::date
 AND j.created_at<p_end
 ), balances AS (SELECT journal_entry_id,sum(COALESCE(debit,0))=sum(COALESCE(credit,0)) AS balanced FROM lines GROUP BY journal_entry_id)
 SELECT jsonb_build_object(
 'line_count',count(*) FILTER(WHERE account_type IN ('revenue','income','expense','expenses')),
 'balanced',COALESCE((SELECT bool_and(balanced) FROM balances),false),
 'unclassified_lines',count(*) FILTER(WHERE account_type IS NULL OR account_type NOT IN ('revenue','income','expense','expenses','asset','assets','liability','liabilities','equity')),
 'revenue',COALESCE(sum(COALESCE(credit,0)-COALESCE(debit,0)) FILTER(WHERE account_type IN ('revenue','income')),0),
 'cost_of_sales',COALESCE(sum(COALESCE(debit,0)-COALESCE(credit,0)) FILTER(WHERE account_type IN ('expense','expenses') AND category IN ('cogs','cost_of_goods_sold','cost_of_sales')),0),
 'operating_expenses',COALESCE(sum(COALESCE(debit,0)-COALESCE(credit,0)) FILTER(WHERE account_type IN ('expense','expenses') AND category NOT IN ('cogs','cost_of_goods_sold','cost_of_sales')),0)
 ) FROM lines
 )) WHERE p_end>p_start AND p_end<=now();$new$;
 IF position(old_part IN d)=0 THEN RAISE EXCEPTION 'Snapshot boundary changed; no update applied'; END IF;
 EXECUTE replace(d,old_part,new_part);
END $migration$;
REVOKE ALL ON FUNCTION public.daily_finance_snapshot(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.daily_finance_snapshot(timestamptz,timestamptz) TO service_role;