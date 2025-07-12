
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

      // Convert quality assessments to payment records
      const qualityPayments: PaymentRecord[] = (qualityData || []).map(assessment => ({
        id: assessment.id,
        supplier: assessment.coffee_record?.supplier_name || 'Unknown Supplier',
        amount: assessment.suggested_price,
        status: assessment.status === 'submitted_to_finance' ? 'Processing' as const : 'Pending' as const,
        date: assessment.date_assessed,
        method: 'Bank Transfer' as const,
        qualityAssessmentId: assessment.id,
        batchNumber: assessment.batch_number
      }));

      // Fetch salary payments data
      const { data: salaryData } = await supabase
        .from('salary_payments')
        .select('*');

      if (salaryData) {
        const totalSalaryPayments = salaryData.reduce((sum, payment) => sum + Number(payment.total_pay), 0);
        const pendingSalaryPayments = salaryData
          .filter(p => p.status === 'Pending')
          .reduce((sum, payment) => sum + Number(payment.total_pay), 0);

        const totalQualityPayments = qualityPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        setStats(prev => ({
          ...prev,
          operatingCosts: totalSalaryPayments,
          pendingPayments: pendingSalaryPayments + totalQualityPayments
        }));
      }

      setPayments(qualityPayments);
      
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
      // Update the quality assessment status
      const { error } = await supabase
        .from('quality_assessments')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Update local state
      setPayments(prev =>
        prev.map(payment =>
          payment.id === paymentId
            ? { ...payment, status: 'Paid' as const, method }
            : payment
        )
      );

      // Update quality assessments state
      setQualityAssessments(prev =>
        prev.map(assessment =>
          assessment.id === paymentId
            ? { ...assessment, status: 'approved' }
            : assessment
        )
      );

      toast({
        title: "Success",
        description: `Payment processed via ${method} and quality assessment approved`
      });

      // Refresh data to update stats
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
