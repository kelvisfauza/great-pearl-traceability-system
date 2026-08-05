import { useQuery } from '@tanstack/react-query';
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
  // Pending coffee payments: lots released to finance and not yet fully paid (Supabase)
  let pendingCoffeePayments = 0;
  let pendingCoffeeAmount = 0;
  {
    const CHUNK = 1000;
    for (let from = 0; from < 20000; from += CHUNK) {
      const { data, error } = await supabase
        .from('finance_coffee_lots')
        .select('total_amount_ugx, quantity_kg, unit_price_ugx, payment_status')
        .eq('finance_status', 'READY_FOR_FINANCE')
        .range(from, from + CHUNK - 1);
      if (error || !data || data.length === 0) break;
      data.forEach((lot: any) => {
        if (String(lot.payment_status || '').toUpperCase() === 'PAID') return;
        pendingCoffeePayments += 1;
        pendingCoffeeAmount +=
          Number(lot.total_amount_ugx) ||
          Number(lot.quantity_kg || 0) * Number(lot.unit_price_ugx || 0);
      });
      if (data.length < CHUNK) break;
    }
  }

  // Calculate available cash from all confirmed transactions: Cash In - Cash Out
  const { data: allTransactions } = await supabase
    .from('finance_cash_transactions')
    .select('amount, transaction_type, status')
    .eq('status', 'confirmed');

  console.log('💰 Finance Stats - All confirmed transactions:', allTransactions?.length);

  let totalCashIn = 0;
  let totalCashOut = 0;
  
  allTransactions?.forEach(transaction => {
    const amount = Math.abs(Number(transaction.amount));
    const type = String(transaction.transaction_type || '').toUpperCase();

    if (type === 'DEPOSIT' || type === 'CASH_IN' || type === 'ADVANCE_RECOVERY') {
      totalCashIn += amount;
    } else if (type === 'PAYMENT' || type === 'PAYMENT_OUT' || type === 'EXPENSE' || type === 'CASH_OUT') {
      totalCashOut += amount;
    }
  });

  console.log('💵 Cash Summary:', {
    totalCashIn,
    totalCashOut,
    netBalance: totalCashIn - totalCashOut
  });

  const rawBalance = totalCashIn - totalCashOut;

  // Skip Firebase supplier advances for fresh start with real data
  // Old test data should not affect current balance calculations
  const netBalance = rawBalance;
  
  // Calculate advance amount (when balance is negative)
  const advanceAmount = netBalance < 0 ? Math.abs(netBalance) : 0;
  
  // Show actual balance including negatives
  const availableCash = netBalance;

  // Fetch pending expense requests from Supabase
  const { data: expenseRequests } = await supabase
    .from('approval_requests')
    .select('amount, status, type')
    .ilike('type', '%expense%')
    .ilike('status', 'pending%');

  const pendingExpenseRequests = expenseRequests?.length || 0;
  const pendingExpenseAmount = expenseRequests?.reduce((sum, req) => 
    sum + Number(req.amount || 0), 0) || 0;

  // Get today's completed payments and confirmed cash deposits
  const today = new Date().toISOString().split('T')[0];
  
  // Get completed payments
  const { data: todayPayments } = await supabase
    .from('supplier_payments')
    .select('amount_paid_ugx')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .eq('status', 'POSTED');

  // Get confirmed cash deposits
  const { data: todayDeposits } = await supabase
    .from('finance_cash_transactions')
    .select('amount, confirmed_at')
    .ilike('transaction_type', 'deposit')
    .eq('status', 'confirmed')
    .gte('confirmed_at', `${today}T00:00:00`)
    .lte('confirmed_at', `${today}T23:59:59`);

  const completedToday = (todayPayments?.length || 0) + (todayDeposits?.length || 0);
  const completedTodayAmount = 
    (todayPayments?.reduce((sum, payment) => sum + Number((payment as any).amount_paid_ugx), 0) || 0) +
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
    refetchInterval: 5000, // Refetch every 5 seconds for more responsive updates
    staleTime: 0, // Always consider data stale to ensure fresh calculations
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
