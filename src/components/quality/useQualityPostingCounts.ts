import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type QualityPostingCounts = {
  total: number;
  pending: number;
  reviewed: number;
  needs_correction: number;
};

const STATUSES = ['pending', 'reviewed', 'needs_correction'] as const;

export async function fetchQualityPostingCounts(includeLinked = false): Promise<QualityPostingCounts> {
  const [total, pending, reviewed, needs_correction] = await Promise.all([
    (supabase as any).from('quality_analysis_postings').select('id', { count: 'exact', head: true }),
    ...(STATUSES.map((status) => {
      let q = (supabase as any)
        .from('quality_analysis_postings')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      if (status === 'pending' && !includeLinked) q = q.is('linked_delivery_id', null);
      return q;
    }) as any[]),
  ]);

  for (const res of [total, pending, reviewed, needs_correction]) {
    if (res.error) throw res.error;
  }

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    reviewed: reviewed.count ?? 0,
    needs_correction: needs_correction.count ?? 0,
  };
}

export function useQualityPostingCounts(includeLinked = false) {
  return useQuery({
    queryKey: ['quality-outlook-posting-counts', includeLinked],
    queryFn: () => fetchQualityPostingCounts(includeLinked),
    refetchInterval: 60_000,
  });
}
