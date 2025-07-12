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

      // Fetch quality assessments that need payment processing
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

      // Fetch existing payment records from database
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      // Combine quality assessments and existing payment records
      const qualityPayments: PaymentRecord[] = (qualityData || []).map(q => ({
        id: q.id,
        supplier: q.coffee_record?.supplier_name || 'Unknown Supplier',
        amount: q.suggested_price * (q.coffee_record?.kilograms || 0),
        status: 'Pending' as const,
        date: q.date_assessed,
        method: 'Bank Transfer' as const,
        qualityAssessmentId: q.id,
        batchNumber: q.batch_number,
        kilograms: q.coffee_record?.kilograms || 0,
        pricePerKg: q.suggested_price
      }));

      const existingPayments: PaymentRecord[] = (paymentData || []).map(p => ({
        id: p.id,
        supplier: p.supplier,
        amount: Number(p.amount),
        status: p.status as PaymentRecord['status'],
        date: p.date,
        method: p.method as PaymentRecord['method'],
        qualityAssessmentId: p.quality_assessment_id || undefined,
        batchNumber: p.batch_number || undefined
      }));

      // Filter out quality payments that already have payment records
      const existingQualityIds = existingPayments
        .filter(p => p.qualityAssessmentId)
        .map(p => p.qualityAssessmentId);
      
      const filteredQualityPayments = qualityPayments.filter(
        qp => !existingQualityIds.includes(qp.qualityAssessmentId)
      );

      setPayments([...existingPayments, ...filteredQualityPayments]);

      // Fetch salary payments data for stats
      const { data: salaryData } = await supabase
        .from('salary_payments')
        .select('*');

      if (salaryData) {
        const totalSalaryPayments = salaryData.reduce((sum, payment) => sum + Number(payment.total_pay), 0);
        const pendingSalaryPayments = salaryData
          .filter(p => p.status === 'Pending')
          .reduce((sum, payment) => sum + Number(payment.total_pay), 0);

        const totalQualityPayments = qualityPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
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

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      // Find the payment record
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment record not found');

      // If it's a bank transfer, create approval request instead of processing directly
      if (method === 'Bank Transfer') {
        const { error: approvalError } = await supabase
          .from('approval_requests')
          .insert({
            type: 'Payment',
            title: `Bank Transfer to ${payment.supplier}`,
            description: `Payment for batch ${payment.batchNumber || 'N/A'} - ${payment.kilograms}kg at ${payment.pricePerKg}/kg`,
            amount: payment.amount.toString(),
            department: 'Finance',
            requestedby: 'Finance Team',
            daterequested: new Date().toLocaleDateString(),
            priority: 'High',
            status: 'Pending',
            details: {
              paymentId: payment.id,
              supplier: payment.supplier,
              amount: payment.amount,
              method,
              batchNumber: payment.batchNumber,
              qualityAssessmentId: payment.qualityAssessmentId
            }
          });

        if (approvalError) throw approvalError;

        // Update payment status to Processing (awaiting approval)
        if (payment.qualityAssessmentId) {
          const { error: paymentError } = await supabase
            .from('payment_records')
            .insert({
              supplier: payment.supplier,
              amount: payment.amount,
              status: 'Processing',
              date: new Date().toISOString().split('T')[0],
              method,
              quality_assessment_id: payment.qualityAssessmentId,
              batch_number: payment.batchNumber
            });

          if (paymentError) throw paymentError;
        } else {
          const { error } = await supabase
            .from('payment_records')
            .update({ 
              status: 'Processing',
              method,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

          if (error) throw error;
        }

        toast({
          title: "Approval Request Created",
          description: `Bank transfer of UGX ${payment.amount.toLocaleString()} has been submitted for manager approval`
        });
      } else {
        // Cash payments can be processed immediately
        if (payment.qualityAssessmentId) {
          // Create payment record in database
          const { error: paymentError } = await supabase
            .from('payment_records')
            .insert({
              supplier: payment.supplier,
              amount: payment.amount,
              status: 'Paid',
              date: new Date().toISOString().split('T')[0],
              method,
              quality_assessment_id: payment.qualityAssessmentId,
              batch_number: payment.batchNumber
            });

          if (paymentError) throw paymentError;

          // Update the quality assessment status
          const { error: qualityError } = await supabase
            .from('quality_assessments')
            .update({ 
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.qualityAssessmentId);

          if (qualityError) throw qualityError;

          // Record transaction
          const { error: transactionError } = await supabase
            .from('finance_transactions')
            .insert({
              type: 'Payment',
              description: `Cash payment to ${payment.supplier} for batch ${payment.batchNumber}`,
              amount: payment.amount,
              time: new Date().toLocaleTimeString(),
              date: new Date().toISOString().split('T')[0]
            });

          if (transactionError) throw transactionError;
        } else {
          // Update existing payment record
          const { error } = await supabase
            .from('payment_records')
            .update({ 
              status: 'Paid',
              method,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

          if (error) throw error;

          // Record transaction
          const { error: transactionError } = await supabase
            .from('finance_transactions')
            .insert({
              type: 'Payment',
              description: `Cash payment to ${payment.supplier}`,
              amount: payment.amount,
              time: new Date().toLocaleTimeString(),
              date: new Date().toISOString().split('T')[0]
            });

          if (transactionError) throw transactionError;
        }

        toast({
          title: "Success",
          description: `Cash payment of UGX ${payment.amount.toLocaleString()} processed successfully`
        });
      }

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
    processPayment,
    refetch: fetchFinanceData
  };
};
