import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcurementReview {
  id: string;
  source_table: string;
  record_id: string;
  request_title: string | null;
  requested_by: string | null;
  amount: number | null;
  decision: 'pending' | 'approved' | 'rejected' | string;
  notes: string | null;
  original_amount: number | null;
  edited_amount: number | null;
  recommended_admin_email: string | null;
  recommended_admin_name: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Advisory procurement pre-review layer.
 * Procurement clears (or rejects / corrects) money requests before administrators
 * give the final approval. Admins are never blocked — they simply see the review.
 */
export const useProcurementReviews = (recordIds?: string[]) => {
  const [reviews, setReviews] = useState<Record<string, ProcurementReview>>({});
  const [loading, setLoading] = useState(true);

  const key = (recordIds || []).slice().sort().join(',');

  const fetchReviews = useCallback(async () => {
    try {
      let query = (supabase as any)
        .from('procurement_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      const ids = key ? key.split(',') : [];
      if (ids.length > 0 && ids.length <= 300) {
        query = query.in('record_id', ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      const map: Record<string, ProcurementReview> = {};
      (data || []).forEach((r: ProcurementReview) => {
        map[r.record_id] = r;
      });
      setReviews(map);
    } catch (err) {
      console.error('Failed to load procurement reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, refresh: fetchReviews };
};
