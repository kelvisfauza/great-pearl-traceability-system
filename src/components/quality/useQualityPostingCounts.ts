import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type QualityPostingCounts = {
  total: number;
  pending: number;
  reviewed: number;
  needs_correction: number;
};

const STATUSES = ['pending', 'reviewed', 'needs_correction'] as const;

export async function fetchQualityPostingCounts(): Promise<QualityPostingCounts> {
  const [total, pending, reviewed, needs_correction] = await Promise.all([
    (supabase as any).from('quality_analysis_postings').select('*', { count: 'exact', head: true }),
    ...(STATUSES.map((status) =>
      (supabase as any)
        .from('quality_analysis_postings')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
    ) as any[]),
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

export function useQualityPostingCounts() {
  return useQuery({
    queryKey: ['quality-outlook-posting-counts'],
    queryFn: fetchQualityPostingCounts,
    refetchInterval: 60_000,
  });
}
