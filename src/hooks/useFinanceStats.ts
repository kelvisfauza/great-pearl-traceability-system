import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface FinanceStats {
  pendingCoffeePayments: number;
  pendingCoffeeAmount: number;
  availableCash: number;
  advanceAmount: number;
  netCash: number;
  pendingExpenseRequests: number;
  pendingExpenseAmount: number;
  completedToday: number;
  completedTodayAmount: number;
}

const fetchStats = async (): Promise<FinanceStats> => {
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

  // Calculate available cash from all confirmed transactions: Cash In - Cash Out
  const { data: allTransactions } = await supabase
    .from('finance_cash_transactions')
    .select('amount, transaction_type, status')
    .eq('status', 'confirmed');

  let totalCashIn = 0;
  let totalCashOut = 0;
  
  allTransactions?.forEach(transaction => {
    const amount = Math.abs(Number(transaction.amount));
    if (transaction.transaction_type === 'DEPOSIT' || transaction.transaction_type === 'ADVANCE_RECOVERY') {
      totalCashIn += amount;
    } else if (transaction.transaction_type === 'PAYMENT' || transaction.transaction_type === 'EXPENSE') {
      totalCashOut += amount;
    }
  });

  const rawBalance = totalCashIn - totalCashOut;

  // Skip Firebase supplier advances for fresh start with real data
  // Old test data should not affect current balance calculations
  const netBalance = rawBalance;
  
  // Calculate advance amount (when balance is negative)
  const advanceAmount = netBalance < 0 ? Math.abs(netBalance) : 0;
  
  // Available cash is 0 if there's an advance, otherwise show the balance
  const availableCash = Math.max(0, netBalance);

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

  return {
    pendingCoffeePayments,
    pendingCoffeeAmount,
    availableCash,
    advanceAmount,
    netCash: netBalance,
    pendingExpenseRequests,
    pendingExpenseAmount,
    completedToday,
    completedTodayAmount
  };
};

export const useFinanceStats = () => {
  const { data: stats, isLoading: loading, refetch } = useQuery({
    queryKey: ['finance-stats'],
    queryFn: fetchStats,
    refetchInterval: 1000, // Refetch every 1 second
  });

  return { 
    stats: stats || {
      pendingCoffeePayments: 0,
      pendingCoffeeAmount: 0,
      availableCash: 0,
      advanceAmount: 0,
      netCash: 0,
      pendingExpenseRequests: 0,
      pendingExpenseAmount: 0,
      completedToday: 0,
      completedTodayAmount: 0
    }, 
    loading, 
    refetch 
  };
};
