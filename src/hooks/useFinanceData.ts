
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

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions from database
      const { data: transactionData, error: transactionError } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;

      const formattedTransactions: FinanceTransaction[] = (transactionData || []).map(t => ({
        id: t.id,
        type: t.type as FinanceTransaction['type'],
        description: t.description,
        amount: Number(t.amount),
        time: t.time,
        date: t.date
      }));
      setTransactions(formattedTransactions);

      // Fetch expenses from database
      const { data: expenseData, error: expenseError } = await supabase
        .from('finance_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expenseError) throw expenseError;

      const formattedExpenses: FinanceExpense[] = (expenseData || []).map(e => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        category: e.category,
        status: e.status as FinanceExpense['status']
      }));
      setExpenses(formattedExpenses);

      // Fetch payment records from database
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      const formattedPayments: PaymentRecord[] = (paymentData || []).map(p => ({
        id: p.id,
        supplier: p.supplier,
        amount: Number(p.amount),
        status: p.status as PaymentRecord['status'],
        date: p.date,
        method: p.method as PaymentRecord['method'],
        qualityAssessmentId: p.quality_assessment_id || undefined,
        batchNumber: p.batch_number || undefined
      }));
      setPayments(formattedPayments);
      
      // Fetch quality assessments that are ready for payment processing
      const { data: qualityData, error: qualityError } = await supabase
        .from('quality_assessments')
        .select(`
          *,
          coffee_record:coffee_records(*)
        `)
        .in('status', ['assessed', 'submitted_to_finance', 'price_requested'])
        .order('created_at', { ascending: false });

      if (qualityError) throw qualityError;
      setQualityAssessments(qualityData || []);

      // Fetch salary payments data for stats
      const { data: salaryData } = await supabase
        .from('salary_payments')
        .select('*');

      if (salaryData) {
        const totalSalaryPayments = salaryData.reduce((sum, payment) => sum + Number(payment.total_pay), 0);
        const pendingSalaryPayments = salaryData
          .filter(p => p.status === 'Pending')
          .reduce((sum, payment) => sum + Number(payment.total_pay), 0);

        const totalQualityPayments = (qualityData || [])
          .filter(q => q.status !== 'approved')
          .reduce((sum, assessment) => sum + assessment.suggested_price, 0);
        
        const totalReceipts = formattedTransactions
          .filter(t => t.type === 'Receipt' || t.type === 'Float')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const totalPayments = formattedTransactions
          .filter(t => t.type === 'Payment' || t.type === 'Expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const currentFloat = formattedTransactions
          .filter(t => t.type === 'Float')
          .reduce((sum, t) => sum + t.amount, 500000);
        
        setStats(prev => ({
          ...prev,
          operatingCosts: totalSalaryPayments,
          pendingPayments: pendingSalaryPayments + totalQualityPayments,
          totalReceipts,
          totalPayments,
          netCashFlow: totalReceipts - totalPayments,
          currentFloat
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

  const processQualityPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      // Find the quality assessment
      const qualityAssessment = qualityAssessments.find(q => q.id === paymentId);
      if (!qualityAssessment) throw new Error('Quality assessment not found');

      // Create payment record in database
      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          supplier: qualityAssessment.coffee_record?.supplier_name || 'Unknown Supplier',
          amount: qualityAssessment.suggested_price,
          status: 'Paid',
          date: new Date().toISOString().split('T')[0],
          method,
          quality_assessment_id: paymentId,
          batch_number: qualityAssessment.batch_number
        });

      if (paymentError) throw paymentError;

      // Update the quality assessment status
      const { error } = await supabase
        .from('quality_assessments')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment processed via ${method} and quality assessment approved`
      });

      // Refresh data to update display
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
      const { error } = await supabase
        .from('finance_transactions')
        .insert({
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          time: transaction.time,
          date: transaction.date
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${transaction.type} recorded successfully`
      });

      // Refresh data to update display
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
      const { error } = await supabase
        .from('finance_expenses')
        .insert({
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
          status: expense.status
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });

      // Refresh data to update display
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
    processPayment: processQualityPayment,
    refetch: fetchFinanceData
  };
};
