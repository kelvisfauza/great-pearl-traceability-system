import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';
import { navigationCount, navigationQueueKeys, pendingQualityBatches, requestActionCounts } from '@/lib/navigationActionCounts';

const db = supabase as any;
async function rows(table: string, columns: string, filter: (query: any) => any = q => q) {
  const all: any[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await filter(db.from(table).select(columns)).order('id').range(start, start + 999);
    if (error) throw error;
    all.push(...(data || []));
    if ((data || []).length < 1000) return all;
  }
}
async function count(table: string, filter: (query: any) => any) {
  const result = await filter(db.from(table).select('id', { count: 'exact', head: true }));
  if (result.error) throw result.error;
  if (result.count === null) throw new Error('Awaiting-action count unavailable');
  return result.count as number;
}

/** Read-only, RLS-scoped, cached across navigation variants; no workflow writes. */
export function useNavigationActionCounts(paths: string[]) {
  const { user, employee } = useAuth();
  const wanted = new Set(paths.flatMap(path => navigationQueueKeys[path] || []));
  const requestsNeeded = ['approvals', 'finance', 'procurementReview', 'leave'].some(key => wanted.has(key));
  const specs = [
    { key: 'requests', enabled: requestsNeeded, load: () => rows('approval_requests', 'id,status,type,title,payout_status,leave_end_date:details->>end_date', q => q.or('status.ilike.pending%,status.ilike.admin approved,status.ilike.admin_approved,status.ilike.finance approved,and(status.ilike.approved,payout_status.eq.failed)')) },
    { key: 'providers', enabled: requestsNeeded && !([...wanted].every(k => k === 'leave')), load: () => rows('provider_submission_requests', 'id,status,request_type,meal_correction_pending', q => q.in('status', ['pending', 'awaiting_finance'])) },
    { key: 'reviews', enabled: wanted.has('procurementReview'), load: () => rows('procurement_reviews', 'id,source_table,record_id,decision') },
    { key: 'loans', enabled: wanted.has('loans'), load: () => count('loans', q => q.eq('status', 'pending_admin')) },
    { key: 'instant', enabled: wanted.has('instant'), load: () => count('instant_withdrawals', q => q.eq('payout_status', 'pending_approval').eq('payment_provider', 'gosente')) },
    { key: 'edits', enabled: wanted.has('edits'), load: () => count('edit_requests', q => q.eq('status', 'pending')) },
    { key: 'deletions', enabled: wanted.has('deletions'), load: () => count('deletion_requests', q => q.eq('status', 'pending')) },
    { key: 'suppliers', enabled: wanted.has('suppliers'), load: () => count('pending_supplier_requests', q => q.eq('status', 'pending')) },
    { key: 'clearances', enabled: wanted.has('clearances'), load: () => count('store_clearance_forms', q => q.eq('procurement_status', 'pending')) },
    { key: 'salaries', enabled: wanted.has('salaries'), load: () => count('employee_salary_payments', q => q.eq('status', 'pending_finance')) },
    { key: 'coffeePayments', enabled: wanted.has('coffeePayments'), load: () => count('finance_coffee_lots', q => q.eq('finance_status', 'READY_FOR_FINANCE')) },
    { key: 'qualityV2', enabled: wanted.has('qualityV2'), load: () => count('coffee_records', q => q.eq('status', 'pending')) },
    { key: 'tickets', enabled: wanted.has('tickets'), load: async () => (await getCountFromServer(query(collection(firestore, 'it_tickets'), where('status', 'in', ['open', 'in-progress'])))).data().count },
    { key: 'qualityRecords', enabled: wanted.has('quality'), load: () => rows('coffee_records', 'id,batch_number,status', q => q.in('status', ['pending', 'quality_review'])) },
    { key: 'assessments', enabled: wanted.has('quality'), load: () => rows('quality_assessments', 'id,store_record_id,batch_number') },
  ];
  const results = useQueries({ queries: specs.map(s => ({
    queryKey: ['navigation-actions', user?.id, s.key],
    queryFn: s.load,
    enabled: !!user && !!employee && s.enabled,
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  })) });
  const data: Record<string, any> = {};
  const failed = new Set<string>();
  specs.forEach((s, i) => {
    if (!s.enabled) return;
    if (results[i].isError) failed.add(s.key);
    else data[s.key] = results[i].data;
  });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const values: Record<string, number | undefined> = {};
  if (data.requests !== undefined) {
    const calculated = requestActionCounts(data.requests.map((r: any) => ({ ...r, details: { end_date: r.leave_end_date } })), data.providers || [], data.reviews || [], today);
    values.leave = calculated.leave;
    if (data.providers !== undefined) {
      values.approvals = calculated.approvals;
      values.finance = calculated.finance;
      if (data.reviews !== undefined) values.procurementReview = calculated.procurementReview;
    }
  }
  for (const key of ['loans', 'instant', 'edits', 'deletions', 'suppliers', 'clearances', 'salaries', 'coffeePayments', 'qualityV2', 'tickets']) values[key] = data[key];
  if (data.qualityRecords !== undefined && data.assessments !== undefined) {
    values.quality = pendingQualityBatches(data.qualityRecords, data.assessments);
  }
  const dependencies: Record<string, string[]> = { approvals: ['requests', 'providers'], finance: ['requests', 'providers'], procurementReview: ['requests', 'providers', 'reviews'], leave: ['requests'], quality: ['qualityRecords', 'assessments'] };
  return (path: string) => {
    const keys = navigationQueueKeys[path];
    if (!keys || !user || !employee) return null;
    const error = keys.some(key => (dependencies[key] || [key]).some(dep => failed.has(dep)));
    return { count: navigationCount(path, values), error };
  };
}