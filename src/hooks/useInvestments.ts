import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Investment {
  id: string;
  amount: number;
  interest_rate: number;
  reduced_rate: number;
  maturity_months: number;
  start_date: string;
  maturity_date: string;
  status: string;
  earned_interest: number;
  total_payout: number;
  withdrawn_at: string | null;
  created_at: string;
}

export const useInvestments = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, employee } = useAuth();
  const { toast } = useToast();

  const fetchInvestments = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('investments' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvestments((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching investments:', err);
    } finally {
      setLoading(false);
    }
  };

  const createInvestment = async (amount: number) => {
    if (!user?.id || !user?.email) return false;

    try {
      const { data, error } = await supabase.functions.invoke('create-investment', {
        body: {
          amount,
          employeeName: employee?.name || user.email,
          employeeEmail: employee?.email || user.email,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to create investment');

      toast({ title: "Investment Created! 📈", description: `UGX ${amount.toLocaleString()} locked for 3 months at 25% interest. Money keeps growing if left!` });
      fetchInvestments();
      return true;
    } catch (err: any) {
      console.error('Error creating investment:', err);
      toast({ title: "Error", description: err.message || "Failed to create investment", variant: "destructive" });
      return false;
    }
  };

  const withdrawEarly = async (investmentId: string) => {
    if (!user?.id) return false;
    try {
      const { data, error } = await supabase.functions.invoke('investment-early-withdraw', {
        body: { investmentId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to withdraw');

      toast({
        title: "Early Withdrawal Complete",
        description: `UGX ${Number(data.payout).toLocaleString()} returned (${Math.round(Number(data.reducedInterest)).toLocaleString()} interest for ${data.daysElapsed} days)`,
      });
      fetchInvestments();
      return true;
    } catch (err: any) {
      console.error('Error withdrawing early:', err);
      toast({ title: "Error", description: err.message || "Failed to withdraw", variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    if (user) fetchInvestments();
  }, [user]);

  const activeInvestments = investments.filter(i => i.status === 'active');
  const totalInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpectedReturn = activeInvestments.reduce((s, i) => s + Number(i.amount) * (1 + Number(i.interest_rate) / 100), 0);

  return {
    investments,
    activeInvestments,
    totalInvested,
    totalExpectedReturn,
    loading,
    createInvestment,
    withdrawEarly,
    refresh: fetchInvestments,
  };
};
