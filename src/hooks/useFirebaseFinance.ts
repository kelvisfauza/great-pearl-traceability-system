import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FinanceTransaction {
  id: string;
  type: string;
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
  status: string;
}

export interface PaymentRecord {
  id: string;
  supplier: string;
  amount: number;
  paid_amount?: number;
  status: string;
  method: string;
  date: string;
  batchNumber?: string;
  qualityAssessmentId?: string;
  rejection_reason?: string | null;
  rejection_comments?: string | null;
}

interface FinanceStats {
  monthlyRevenue: number;
  pendingPayments: number;
  operatingCosts: number;
  cashOnHand: number;
  currentFloat: number;
  totalReceipts: number;  
  totalPayments: number;
  netCashFlow: number;
}

export const useFirebaseFinance = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    monthlyRevenue: 15750000,
    pendingPayments: 2340000,
    operatingCosts: 8500000,
    cashOnHand: 5200000,
    currentFloat: 500000,
    totalReceipts: 12450000,
    totalPayments: 6780000,
    netCashFlow: 5670000
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      console.log('Loading mock finance data...');

      // Mock data for now
      const mockTransactions: FinanceTransaction[] = [
        {
          id: '1',
          type: 'Income',
          description: 'Coffee Sales',
          amount: 2500000,
          time: '09:30',
          date: new Date().toLocaleDateString()
        }
      ];

      const mockExpenses: FinanceExpense[] = [
        {
          id: '1',
          description: 'Office Supplies',
          amount: 150000,
          date: new Date().toLocaleDateString(),
          category: 'Operations',
          status: 'Approved'
        }
      ];

      const mockPayments: PaymentRecord[] = [
        {
          id: '1',
          supplier: 'Premium Coffee Suppliers',
          amount: 5000000,
          status: 'Pending',
          method: 'Bank Transfer',
          date: new Date().toLocaleDateString(),
          batchNumber: 'BATCH001'
        }
      ];

      setTransactions(mockTransactions);
      setExpenses(mockExpenses);
      setPayments(mockPayments);
      
      console.log('Mock finance data loaded successfully');
    } catch (error) {
      console.error('Error loading finance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch finance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<FinanceTransaction, 'id'>) => {
    try {
      console.log('Adding transaction:', transaction);
      const newTransaction = {
        id: `trans_${Date.now()}`,
        ...transaction
      };
      setTransactions(prev => [newTransaction, ...prev]);
      
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to record transaction",
        variant: "destructive"
      });
    }
  };

  const addExpense = async (expense: Omit<FinanceExpense, 'id'>) => {
    try {
      console.log('Adding expense:', expense);
      const newExpense = {
        id: `exp_${Date.now()}`,
        ...expense
      };
      setExpenses(prev => [newExpense, ...prev]);
      
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive"
      });
    }
  };

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash', actualAmount?: number) => {
    try {
      console.log('Processing payment:', paymentId, method);
      
      setPayments(prev => 
        prev.map(p => 
          p.id === paymentId 
            ? { ...p, status: method === 'Bank Transfer' ? 'Processing' : 'Paid', method }
            : p
        )
      );

      toast({
        title: "Success",
        description: `Payment ${method === 'Bank Transfer' ? 'submitted for approval' : 'processed successfully'}`,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  const handleModifyPayment = async (paymentId: string, targetDepartment: string, reason: string, comments?: string) => {
    try {
      console.log('Modifying payment:', paymentId, targetDepartment, reason);
      
      setPayments(prev => 
        prev.map(p => 
          p.id === paymentId 
            ? { ...p, status: 'Under Modification' }
            : p
        )
      );

      toast({
        title: "Success",
        description: `Payment sent to ${targetDepartment} for modification`,
      });
    } catch (error) {
      console.error('Error modifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to send payment for modification",
        variant: "destructive"
      });
    }
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
    handleModifyPayment,
    refetch: fetchFinanceData
  };
};