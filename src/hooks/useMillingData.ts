import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MillingCustomer {
  id: string;
  full_name: string;
  opening_balance: number;
  current_balance: number;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MillingTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  kgs_hulled: number;
  rate_per_kg: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  transaction_type: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface MillingCashTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  amount_paid: number;
  previous_balance: number;
  new_balance: number;
  payment_method: string;
  notes?: string;
  date: string;
  created_at: string;
  created_by: string;
}

export interface MillingStats {
  totalCustomers: number;
  activeCustomers: number;
  totalDebts: number;
  cashReceived: number;
  totalKgsHulled: number;
  monthlyRevenue: number;
}

export const useMillingData = () => {
  const [customers, setCustomers] = useState<MillingCustomer[]>([]);
  const [transactions, setTransactions] = useState<MillingTransaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<MillingCashTransaction[]>([]);
  const [stats, setStats] = useState<MillingStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalDebts: 0,
    cashReceived: 0,
    totalKgsHulled: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('milling_customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('milling_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch cash transactions
      const { data: cashTransactionsData, error: cashTransactionsError } = await supabase
        .from('milling_cash_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (cashTransactionsError) throw cashTransactionsError;

      setCustomers(customersData || []);
      setTransactions(transactionsData || []);
      setCashTransactions(cashTransactionsData || []);

      // Calculate stats
      calculateStats(customersData || [], transactionsData || [], cashTransactionsData || []);
      
    } catch (error) {
      console.error('Error fetching milling data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch milling data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (customers: MillingCustomer[], transactions: MillingTransaction[], cashTransactions: MillingCashTransaction[]) => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    const totalDebts = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
    });
    
    const monthlyCashTransactions = cashTransactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
    });
    
    const totalKgsHulled = monthlyTransactions.reduce((sum, t) => sum + (t.kgs_hulled || 0), 0);
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const cashReceived = monthlyCashTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);

    setStats({
      totalCustomers,
      activeCustomers,
      totalDebts,
      cashReceived,
      totalKgsHulled,
      monthlyRevenue
    });
  };

  const addCustomer = async (customerData: Omit<MillingCustomer, 'id' | 'created_at' | 'updated_at' | 'current_balance'>) => {
    try {
      const { data, error } = await supabase
        .from('milling_customers')
        .insert([{
          ...customerData,
          current_balance: customerData.opening_balance
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Customer added successfully"
      });

      await fetchData();
      return data;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addTransaction = async (transactionData: Omit<MillingTransaction, 'id' | 'created_at' | 'updated_at' | 'balance'>) => {
    try {
      // Calculate balance
      const balance = transactionData.total_amount - transactionData.amount_paid;

      // Add transaction
      const { data: transactionResult, error: transactionError } = await supabase
        .from('milling_transactions')
        .insert([{
          ...transactionData,
          balance
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw transactionError;
      }

      // Update customer balance
      const customer = customers.find(c => c.id === transactionData.customer_id);
      if (customer) {
        const newBalance = customer.current_balance + balance;
        
        const { error: updateError } = await supabase
          .from('milling_customers')
          .update({ current_balance: newBalance })
          .eq('id', transactionData.customer_id);

        if (updateError) {
          console.error('Customer update error:', updateError);
          throw updateError;
        }
      }

      toast({
        title: "Success",
        description: "Transaction recorded successfully"
      });

      await fetchData();
      return transactionResult;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to record transaction. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addCashTransaction = async (cashData: Omit<MillingCashTransaction, 'id' | 'created_at' | 'previous_balance' | 'new_balance'>) => {
    try {
      const customer = customers.find(c => c.id === cashData.customer_id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const previousBalance = customer.current_balance;
      const newBalance = Math.max(0, previousBalance - cashData.amount_paid);

      // Add cash transaction
      const { data: cashResult, error: cashError } = await supabase
        .from('milling_cash_transactions')
        .insert([{
          ...cashData,
          previous_balance: previousBalance,
          new_balance: newBalance
        }])
        .select()
        .single();

      if (cashError) {
        console.error('Cash transaction error:', cashError);
        throw cashError;
      }

      // Update customer balance
      const { error: updateError } = await supabase
        .from('milling_customers')
        .update({ current_balance: newBalance })
        .eq('id', cashData.customer_id);

      if (updateError) {
        console.error('Customer balance update error:', updateError);
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });

      await fetchData();
      return cashResult;
    } catch (error) {
      console.error('Error adding cash transaction:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getReportData = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const weekStart = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const filteredTransactions = transactions.filter(t => new Date(t.date) >= startDate);
    const filteredCashTransactions = cashTransactions.filter(t => new Date(t.date) >= startDate);

    return {
      transactions: filteredTransactions,
      cashTransactions: filteredCashTransactions,
      summary: {
        totalKgsHulled: filteredTransactions.reduce((sum, t) => sum + t.kgs_hulled, 0),
        totalRevenue: filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0),
        totalCashReceived: filteredCashTransactions.reduce((sum, t) => sum + t.amount_paid, 0),
        totalTransactions: filteredTransactions.length,
        totalPayments: filteredCashTransactions.length
      }
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    customers,
    transactions,
    cashTransactions,
    stats,
    loading,
    addCustomer,
    addTransaction,
    addCashTransaction,
    getReportData,
    fetchData
  };
};