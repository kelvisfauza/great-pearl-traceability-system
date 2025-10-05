import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface FinanceStats {
  pendingCoffeePayments: number;
  pendingCoffeeAmount: number;
  availableCash: number;
  pendingExpenseRequests: number;
  pendingExpenseAmount: number;
  completedToday: number;
  completedTodayAmount: number;
}

export const useFinanceStats = () => {
  const [stats, setStats] = useState<FinanceStats>({
    pendingCoffeePayments: 0,
    pendingCoffeeAmount: 0,
    availableCash: 0,
    pendingExpenseRequests: 0,
    pendingExpenseAmount: 0,
    completedToday: 0,
    completedTodayAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Set up real-time subscription for cash balance and transactions
    const cashChannel = supabase
      .channel('finance-cash-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_cash_balance'
        },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_cash_transactions'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cashChannel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch pending coffee payments from quality assessments
      const qualityQuery = query(
        collection(db, 'quality_assessments'),
        where('status', 'in', ['assessed', 'submitted_to_finance'])
      );
      const qualitySnapshot = await getDocs(qualityQuery);
      const pendingCoffeePayments = qualitySnapshot.size;
      
      // Calculate pending coffee amount
      let pendingCoffeeAmount = 0;
      qualitySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const kilograms = data.kilograms || 0;
        const pricePerKg = data.suggested_price || 0;
        pendingCoffeeAmount += kilograms * pricePerKg;
      });

      // Fetch available cash from Supabase (only confirmed balance)
      const { data: cashBalance } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      const availableCash = cashBalance?.current_balance || 0;

      // Fetch pending expense requests from Supabase
      const { data: expenseRequests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .eq('status', 'Pending');

      const pendingExpenseRequests = expenseRequests?.length || 0;
      const pendingExpenseAmount = expenseRequests?.reduce((sum, req) => 
        sum + parseFloat(req.amount || '0'), 0) || 0;

      // Get today's completed payments and confirmed cash deposits
      const today = new Date().toISOString().split('T')[0];
      
      // Get completed payments
      const { data: todayPayments } = await supabase
        .from('payment_records')
        .select('amount')
        .eq('date', today)
        .eq('status', 'Paid');

      // Get confirmed cash deposits
      const { data: todayDeposits } = await supabase
        .from('finance_cash_transactions')
        .select('amount, confirmed_at')
        .eq('transaction_type', 'DEPOSIT')
        .eq('status', 'confirmed')
        .gte('confirmed_at', `${today}T00:00:00`)
        .lte('confirmed_at', `${today}T23:59:59`);

      const completedToday = (todayPayments?.length || 0) + (todayDeposits?.length || 0);
      const completedTodayAmount = 
        (todayPayments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0) +
        (todayDeposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0);

      setStats({
        pendingCoffeePayments,
        pendingCoffeeAmount,
        availableCash,
        pendingExpenseRequests,
        pendingExpenseAmount,
        completedToday,
        completedTodayAmount
      });
    } catch (error) {
      console.error('Error fetching finance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};