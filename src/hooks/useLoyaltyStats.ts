import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LoyaltyStats {
  monthlyEarnings: number;
  monthlyRemaining: number;
  monthlyCap: number;
  todayEarnings: number;
  activityBreakdown: Record<string, { count: number; total: number }>;
  recentRewards: Array<{
    activity_type: string;
    reward_amount: number;
    created_at: string;
  }>;
}

export const useLoyaltyStats = () => {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch monthly loyalty ledger entries
      const { data: ledgerData } = await supabase
        .from('ledger_entries')
        .select('amount, metadata, created_at')
        .eq('user_id', user.id)
        .eq('entry_type', 'LOYALTY_REWARD')
        .gte('created_at', monthStart.toISOString());

      const monthlyEarnings = (ledgerData || []).reduce((sum, e) => sum + Number(e.amount), 0);

      const todayEarnings = (ledgerData || []).filter(
        e => new Date(e.created_at) >= todayStart
      ).reduce((sum, e) => sum + Number(e.amount), 0);

      // Build activity breakdown
      const breakdown: Record<string, { count: number; total: number }> = {};
      (ledgerData || []).forEach(entry => {
        const meta = entry.metadata as any;
        const type = meta?.activity_type || 'other';
        if (!breakdown[type]) breakdown[type] = { count: 0, total: 0 };
        breakdown[type].count += 1;
        breakdown[type].total += Number(entry.amount);
      });

      // Recent rewards (last 5)
      const recent = (ledgerData || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(e => ({
          activity_type: (e.metadata as any)?.activity_type || 'other',
          reward_amount: Number(e.amount),
          created_at: e.created_at,
        }));

      setStats({
        monthlyEarnings,
        monthlyRemaining: Math.max(0, 50000 - monthlyEarnings),
        monthlyCap: 50000,
        todayEarnings,
        activityBreakdown: breakdown,
        recentRewards: recent,
      });
    } catch (error) {
      console.error('Error fetching loyalty stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return { stats, loading, refreshStats: fetchStats };
};
