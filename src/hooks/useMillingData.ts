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

export interface MillingExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MillingStats {
  totalCustomers: number;
  activeCustomers: number;
  totalDebts: number;
  cashReceived: number;
  totalKgsHulled: number;
  monthlyRevenue: number;
  totalExpenses: number;
  netRevenue: number;
}

export const useMillingData = () => {
  const [customers, setCustomers] = useState<MillingCustomer[]>([]);
  const [transactions, setTransactions] = useState<MillingTransaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<MillingCashTransaction[]>([]);
  const [expenses, setExpenses] = useState<MillingExpense[]>([]);
  const [stats, setStats] = useState<MillingStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalDebts: 0,
    cashReceived: 0,
    totalKgsHulled: 0,
    monthlyRevenue: 0,
    totalExpenses: 0,
    netRevenue: 0
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

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('milling_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      setCustomers(customersData || []);
      setTransactions(transactionsData || []);
      setCashTransactions(cashTransactionsData || []);
      setExpenses(expensesData || []);

      // Calculate stats
      calculateStats(customersData || [], transactionsData || [], cashTransactionsData || [], expensesData || []);
      
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

  const calculateStats = (customers: MillingCustomer[], transactions: MillingTransaction[], cashTransactions: MillingCashTransaction[], expenses: MillingExpense[]) => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    const totalDebts = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    
    // Debug logging
    console.log('📊 Stats Calculation Debug:', {
      totalCustomers,
      activeCustomers,
      totalDebts,
      customerBalances: customers.map(c => ({ name: c.full_name, balance: c.current_balance })),
      transactionsCount: transactions.length,
      cashTransactionsCount: cashTransactions.length
    });
    
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

    const monthlyExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    
    const totalKgsHulled = monthlyTransactions.reduce((sum, t) => sum + (t.kgs_hulled || 0), 0);
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netRevenue = monthlyRevenue - totalExpenses;
    
    // Cash received = sum of amount_paid from milling transactions + cash transactions in current month
    const cashFromTransactions = monthlyTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
    const cashFromPayments = monthlyCashTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
    const cashReceived = cashFromTransactions + cashFromPayments;

    setStats({
      totalCustomers,
      activeCustomers,
      totalDebts,
      cashReceived,
      totalKgsHulled,
      monthlyRevenue,
      totalExpenses,
      netRevenue
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

  const addExpense = async (expenseData: Omit<MillingExpense, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('milling_expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });

      await fetchData();
      return data;
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to record expense. Please try again.",
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
    const filteredExpenses = expenses.filter(e => new Date(e.date) >= startDate);

    // Calculate total cash received from both transaction types
    const cashFromTransactions = filteredTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
    const cashFromPayments = filteredCashTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
    const totalCashReceived = cashFromTransactions + cashFromPayments;
    
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      transactions: filteredTransactions,
      cashTransactions: filteredCashTransactions,
      expenses: filteredExpenses,
      summary: {
        totalKgsHulled: filteredTransactions.reduce((sum, t) => sum + (t.kgs_hulled || 0), 0),
        totalRevenue,
        totalCashReceived,
        totalExpenses,
        netRevenue: totalRevenue - totalExpenses,
        totalTransactions: filteredTransactions.length,
        totalPayments: filteredCashTransactions.length
      }
    };
  };

  const clearAllData = async () => {
    try {
      setLoading(true);

      // Delete all records from each table
      const { error: transactionsError } = await supabase
        .from('milling_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (transactionsError) throw transactionsError;

      const { error: cashTransactionsError } = await supabase
        .from('milling_cash_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (cashTransactionsError) throw cashTransactionsError;

      const { error: expensesError } = await supabase
        .from('milling_expenses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (expensesError) throw expensesError;

      const { error: customersError } = await supabase
        .from('milling_customers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (customersError) throw customersError;

      toast({
        title: "Success",
        description: "All milling data cleared successfully"
      });

      // Refresh data to show empty state
      await fetchData();
      
      return true;
    } catch (error) {
      console.error('Error clearing milling data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearAllDebts = async () => {
    try {
      setLoading(true);

      // Get all customers with non-zero balances
      const customersWithDebts = customers.filter(c => c.current_balance > 0);

      if (customersWithDebts.length === 0) {
        toast({
          title: "No Debts",
          description: "All customers have zero balance"
        });
        return;
      }

      // Update all customer balances to 0
      const { error: updateError } = await supabase
        .from('milling_customers')
        .update({ current_balance: 0 })
        .gt('current_balance', 0);

      if (updateError) throw updateError;

      // Record cash transactions for each customer
      const cashTransactionRecords = customersWithDebts.map(customer => ({
        customer_id: customer.id,
        customer_name: customer.full_name,
        amount_paid: customer.current_balance,
        previous_balance: customer.current_balance,
        new_balance: 0,
        payment_method: 'Bulk Clear',
        date: new Date().toISOString().split('T')[0],
        notes: 'Bulk debt clearance',
        created_by: 'System'
      }));

      const { error: cashError } = await supabase
        .from('milling_cash_transactions')
        .insert(cashTransactionRecords);

      if (cashError) throw cashError;

      toast({
        title: "Success",
        description: `Cleared debts for ${customersWithDebts.length} customers`
      });

      // Refresh data
      await fetchData();
      
      return true;
    } catch (error) {
      console.error('Error clearing all debts:', error);
      toast({
        title: "Error",
        description: "Failed to clear debts. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    customers,
    transactions,
    cashTransactions,
    expenses,
    stats,
    loading,
    addCustomer,
    addTransaction,
    addCashTransaction,
    addExpense,
    getReportData,
    fetchData,
    clearAllData,
    clearAllDebts,
    updateMillingTransaction: async (id: string, updates: Partial<MillingTransaction>) => {
      try {
        const { error } = await supabase
          .from('milling_transactions')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        // Refresh data
        await fetchData();
        
        return true;
      } catch (error) {
        console.error('Error updating milling transaction:', error);
        throw error;
      }
    },
    deleteTransaction: async (id: string) => {
      try {
        const { error } = await supabase
          .from('milling_transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Transaction deleted successfully"
        });

        // Refresh data
        await fetchData();
        
        return true;
      } catch (error) {
        console.error('Error deleting milling transaction:', error);
        toast({
          title: "Error",
          description: "Failed to delete transaction. Please try again.",
          variant: "destructive"
        });
        throw error;
      }
    }
  };
};