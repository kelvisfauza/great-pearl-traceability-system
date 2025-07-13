
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

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
  qualityAssessmentId?: string;
  batchNumber?: string;
  kilograms?: number;
  pricePerKg?: number;
}

export interface QualityAssessmentForPayment extends Tables<'quality_assessments'> {
  coffee_record?: Tables<'coffee_records'>;
}

export const useFinanceData = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessmentForPayment[]>([]);
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

  const recordDailyTask = async (taskType: string, description: string, amount?: number, batchNumber?: string, completedBy: string = 'Finance Team') => {
    try {
      console.log('Recording daily task:', { taskType, description, amount, batchNumber, completedBy });
      // Mock implementation during Firebase migration
    } catch (error) {
      console.error('Error recording daily task:', error);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Mock data during Firebase migration
      const mockTransactions: FinanceTransaction[] = [
        {
          id: '1',
          type: 'Receipt',
          description: 'Coffee sale to export customer',
          amount: 250000,
          time: '10:30 AM',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: '2',
          type: 'Payment',
          description: 'Payment to supplier John Doe',
          amount: 150000,
          time: '2:15 PM',
          date: new Date().toISOString().split('T')[0]
        }
      ];
      
      const mockExpenses: FinanceExpense[] = [
        {
          id: '1',
          description: 'Office supplies',
          amount: 25000,
          date: new Date().toISOString().split('T')[0],
          category: 'Operations',
          status: 'Approved'
        }
      ];
      
      const mockPayments: PaymentRecord[] = [
        {
          id: '1',
          supplier: 'John Doe Coffee Farm',
          amount: 180000,
          status: 'Pending',
          date: new Date().toISOString().split('T')[0],
          method: 'Bank Transfer',
          batchNumber: 'BATCH001',
          kilograms: 100,
          pricePerKg: 1800
        }
      ];

      setTransactions(mockTransactions);
      setExpenses(mockExpenses);
      setPayments(mockPayments);
      setQualityAssessments([]);
      
      // Update stats with mock data
      const totalReceipts = mockTransactions
        .filter(t => t.type === 'Receipt' || t.type === 'Float')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalPayments = mockTransactions
        .filter(t => t.type === 'Payment' || t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats(prev => ({
        ...prev,
        totalReceipts,
        totalPayments,
        netCashFlow: totalReceipts - totalPayments,
        pendingPayments: mockPayments.reduce((sum, p) => sum + p.amount, 0),
        operatingCosts: mockExpenses.reduce((sum, e) => sum + e.amount, 0)
      }));
      
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

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment record not found');

      if (method === 'Bank Transfer') {
        // Mock approval request creation
        console.log('Creating approval request for bank transfer:', payment);
        
        await recordDailyTask(
          'Payment Request',
          `Bank transfer approval requested for ${payment.supplier} - UGX ${payment.amount.toLocaleString()}`,
          payment.amount,
          payment.batchNumber
        );

        toast({
          title: "Approval Request Created",
          description: `Bank transfer of UGX ${payment.amount.toLocaleString()} has been submitted for manager approval`
        });
      } else {
        // Mock cash payment processing
        console.log('Processing cash payment:', payment);
        
        await recordDailyTask(
          'Payment',
          `Cash payment to ${payment.supplier} - UGX ${payment.amount.toLocaleString()}`,
          payment.amount,
          payment.batchNumber
        );

        toast({
          title: "Success",
          description: `Cash payment of UGX ${payment.amount.toLocaleString()} processed successfully`
        });
      }

      fetchFinanceData();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (transaction: Omit<FinanceTransaction, 'id'>) => {
    try {
      console.log('Adding transaction:', transaction);
      
      await recordDailyTask(
        transaction.type,
        transaction.description,
        transaction.amount
      );

      toast({
        title: "Success",
        description: `${transaction.type} recorded successfully`
      });

      fetchFinanceData();
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
      
      await recordDailyTask(
        'Expense',
        `${expense.description} - ${expense.category}`,
        expense.amount
      );

      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });

      fetchFinanceData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to record expense",
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
    qualityAssessments,
    stats,
    loading,
    addTransaction,
    addExpense,
    processPayment,
    refetch: fetchFinanceData
  };
};
