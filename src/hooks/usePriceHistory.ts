import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryRecord {
  id: string;
  price_date: string;
  arabica_outturn: number;
  arabica_moisture: number;
  arabica_fm: number;
  arabica_buying_price: number;
  robusta_outturn: number;
  robusta_moisture: number;
  robusta_fm: number;
  robusta_buying_price: number;
  ice_arabica: number;
  robusta_international: number;
  exchange_rate: number;
  drugar_local: number;
  wugar_local: number;
  robusta_faq_local: number;
  created_at: string;
}

export interface PriceComparison {
  today: PriceHistoryRecord | null;
  yesterday: PriceHistoryRecord | null;
  lastWeek: PriceHistoryRecord | null;
  lastMonth: PriceHistoryRecord | null;
}

export const usePriceHistory = (days: number = 30) => {
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
  const [comparison, setComparison] = useState<PriceComparison>({
    today: null,
    yesterday: null,
    lastWeek: null,
    lastMonth: null
  });
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .gte('price_date', startDate.toISOString().split('T')[0])
        .order('price_date', { ascending: true });

      if (error) {
        console.error('Error fetching price history:', error);
        return;
      }

      setHistory(data || []);

      // Calculate comparisons
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      const findByDate = (date: string) => 
        data?.find(r => r.price_date === date) || null;

      setComparison({
        today: findByDate(today),
        yesterday: findByDate(yesterday),
        lastWeek: findByDate(lastWeek),
        lastMonth: findByDate(lastMonth)
      });

    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const calculateChange = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous || previous === 0) return { change: 0, percent: 0 };
    const change = current - previous;
    const percent = ((change / previous) * 100);
    return { change, percent };
  };

  return {
    history,
    comparison,
    loading,
    refreshHistory: fetchHistory,
    calculateChange
  };
};
