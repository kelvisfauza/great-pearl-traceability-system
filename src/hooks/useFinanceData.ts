
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FinanceTransaction {
  id: string;
  type: 'Receipt' | 'Payment' | 'Expense' | 'Float';
  description: string;
  amount: number;
  time: string;
  date: string;
}

export interface FinanceExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: 'Approved' | 'Pending';
}

export interface PaymentRecord {
  id: string;
  supplier: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Processing';
  date: string;
  method: 'Bank Transfer' | 'Cash';
}

export const useFinanceData = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    pendingPayments: 0,
    operatingCosts: 0,
    cashOnHand: 0,
    totalReceipts: 0,
    totalPayments: 0,
    netCashFlow: 0,
    currentFloat: 500000
  });
  const { toast } = useToast();

  const fetchFinanceData = async () => {
    try {
      // For now, we'll use sample data since we don't have specific finance tables
      // In a real implementation, you would fetch from actual finance tables
      setTransactions([]);
      setExpenses([]);
      setPayments([]);
      
      // Calculate stats from salary payments and other data
      const { data: salaryData } = await supabase
        .from('salary_payments')
        .select('*');

      if (salaryData) {
        const totalSalaryPayments = salaryData.reduce((sum, payment) => sum + Number(payment.total_pay), 0);
        setStats(prev => ({
          ...prev,
          operatingCosts: totalSalaryPayments,
          pendingPayments: salaryData
            .filter(p => p.status === 'Pending')
            .reduce((sum, payment) => sum + Number(payment.total_pay), 0)
        }));
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch finance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = (transaction: Omit<FinanceTransaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString()
    };
    setTransactions(prev => [newTransaction, ...prev]);
    
    // Update stats based on transaction type
    if (transaction.type === 'Receipt') {
      setStats(prev => ({
        ...prev,
        totalReceipts: prev.totalReceipts + transaction.amount,
        netCashFlow: prev.totalReceipts + transaction.amount - prev.totalPayments
      }));
    } else if (transaction.type === 'Payment' || transaction.type === 'Expense') {
      setStats(prev => ({
        ...prev,
        totalPayments: prev.totalPayments + transaction.amount,
        netCashFlow: prev.totalReceipts - (prev.totalPayments + transaction.amount)
      }));
    } else if (transaction.type === 'Float') {
      setStats(prev => ({
        ...prev,
        currentFloat: transaction.amount
      }));
    }

    toast({
      title: "Success",
      description: `${transaction.type} recorded successfully`
    });
  };

  const addExpense = (expense: Omit<FinanceExpense, 'id'>) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    toast({
      title: "Success",
      description: "Expense recorded successfully"
    });
  };

  const processPayment = (paymentId: string, method: 'Bank Transfer' | 'Cash', amount?: number) => {
    setPayments(prev =>
      prev.map(payment =>
        payment.id === paymentId
          ? { ...payment, status: 'Paid' as const, method }
          : payment
      )
    );
    toast({
      title: "Success",
      description: `Payment processed via ${method}`
    });
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  return {
    transactions,
    expenses,
    payments,
    stats,
    loading,
    addTransaction,
    addExpense,
    processPayment,
    refetch: fetchFinanceData
  };
};
