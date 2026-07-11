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
      // Deduct from wallet first
      const { data: userIdData } = await supabase.rpc('get_unified_user_id', { input_email: employee?.email || user.email });
      const unifiedId = userIdData || user.id;

      // Validate balance using the safe balance RPC instead of validate_withdrawal_balance (which has type issues)
      const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: employee?.email || user.email });
      const userBalance = balanceData?.[0];
      const availableBalance = Number(userBalance?.available_balance) || 0;
      
      if (amount > availableBalance) {
        toast({ title: "Insufficient Balance", description: `Your available balance is UGX ${availableBalance.toLocaleString()}`, variant: "destructive" });
        return false;
      }

      const investRef = `INVEST-${Date.now().toString().slice(-8)}`;

      // Create ledger debit (freeze funds)
      const { error: ledgerErr } = await supabase.from('ledger_entries' as any).insert([{
        user_id: unifiedId,
        entry_type: 'WITHDRAWAL',
        amount: -amount,
        reference: investRef,
        source_category: 'WITHDRAWAL',
        metadata: {
          description: `Investment locked - ${investRef}`,
          type: 'investment_lock',
          investment_amount: amount,
          bypass_treasury_check: true,
        },
      }]);
      if (ledgerErr) throw ledgerErr;

      // Create the investment record
      const { error: investErr } = await supabase.from('investments' as any).insert([{
        user_id: user.id,
        user_email: employee?.email || user.email,
        employee_name: employee?.name || user.email,
        amount,
        start_date: new Date().toISOString().split('T')[0],
      }]);
      if (investErr) throw investErr;

      toast({ title: "Investment Created! 📈", description: `UGX ${amount.toLocaleString()} locked for 3 months at 25% interest. Money keeps growing if left!` });

      // Send email notification
      const startDate = new Date().toISOString().split('T')[0];
      const maturityDate = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'investment-confirmation',
            recipientEmail: employee?.email || user.email,
            idempotencyKey: `investment-confirm-${investRef}`,
            templateData: {
              employeeName: employee?.name || user.email,
              amount,
              interestRate: 25,
              maturityMonths: 3,
              expectedReturn: amount * 1.25,
              startDate,
              maturityDate,
              investmentRef: investRef,
            },
          },
        });
      } catch (emailErr) {
        console.warn('Failed to send investment email:', emailErr);
      }

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
