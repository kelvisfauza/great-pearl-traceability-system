
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      
      // Save to Firebase
      await addDoc(collection(db, 'daily_tasks'), {
        task_type: taskType,
        description,
        amount,
        batch_number: batchNumber,
        completed_by: completedBy,
        completed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        department: 'Finance',
        created_at: new Date().toISOString()
      });

      // Save to Supabase
      await supabase.from('daily_tasks').insert({
        task_type: taskType,
        description,
        amount,
        batch_number: batchNumber,
        completed_by: completedBy,
        completed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        department: 'Finance'
      });

      console.log('Daily task recorded successfully to both databases');
    } catch (error) {
      console.error('Error recording daily task:', error);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch all finance data...');
      
      // Fetch transactions from Firebase
      console.log('Fetching finance transactions from Firebase...');
      const transactionsQuery = query(collection(db, 'finance_transactions'), orderBy('created_at', 'desc'));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinanceTransaction[];
      console.log('Finance transactions loaded:', transactionsData.length, 'records');
      setTransactions(transactionsData);

      // Fetch expenses from Firebase
      console.log('Fetching finance expenses from Firebase...');
      const expensesQuery = query(collection(db, 'finance_expenses'), orderBy('created_at', 'desc'));
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinanceExpense[];
      console.log('Finance expenses loaded:', expensesData.length, 'records');
      setExpenses(expensesData);

      // Fetch payment records from Firebase
      console.log('Fetching payment records from Firebase...');
      const paymentsQuery = query(collection(db, 'payment_records'), orderBy('created_at', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          supplier: data.supplier || '',
          amount: Number(data.amount) || 0,
          status: data.status || 'Pending',
          date: data.date || new Date().toISOString().split('T')[0],
          method: data.method || 'Bank Transfer',
          qualityAssessmentId: data.quality_assessment_id,
          batchNumber: data.batch_number,
          kilograms: data.kilograms ? Number(data.kilograms) : undefined,
          pricePerKg: data.price_per_kg ? Number(data.price_per_kg) : undefined
        };
      }) as PaymentRecord[];
      console.log('Payment records loaded:', paymentsData.length, 'records');
      setPayments(paymentsData);

      // Update stats
      const totalReceipts = transactionsData
        .filter(t => t.type === 'Receipt' || t.type === 'Float')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
      const totalPayments = transactionsData
        .filter(t => t.type === 'Payment' || t.type === 'Expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const pendingPayments = paymentsData
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
      const operatingCosts = expensesData
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const newStats = {
        monthlyRevenue: totalReceipts,
        totalReceipts,
        totalPayments,
        netCashFlow: totalReceipts - totalPayments,
        pendingPayments,
        operatingCosts,
        cashOnHand: totalReceipts - totalPayments,
        currentFloat: 500000
      };
      
      setStats(newStats);
      console.log('Finance stats updated:', newStats);
      
    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch finance data. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('Finance data fetch completed');
    }
  };

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      console.log('Processing payment:', paymentId, method);
      
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment record not found');

      if (method === 'Bank Transfer') {
        console.log('Creating approval request for bank transfer...');
        
        const approvalRequestData = {
          type: 'Bank Transfer',
          title: `Bank transfer to ${payment.supplier}`,
          description: `Payment to ${payment.supplier} - UGX ${payment.amount.toLocaleString()}${payment.batchNumber ? ` (Batch: ${payment.batchNumber})` : ''}`,
          amount: payment.amount.toString(),
          department: 'Finance',
          requestedby: 'Finance Team',
          daterequested: new Date().toLocaleDateString(),
          priority: 'High',
          status: 'Pending',
          details: {
            paymentId,
            supplier: payment.supplier,
            amount: payment.amount,
            batchNumber: payment.batchNumber,
            kilograms: payment.kilograms,
            pricePerKg: payment.pricePerKg,
            paymentType: 'supplier_payment',
            qualityAssessmentId: payment.qualityAssessmentId
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Save to Firebase
        console.log('Saving approval request to Firebase...');
        const firebaseDoc = await addDoc(collection(db, 'approval_requests'), approvalRequestData);
        console.log('Firebase approval request created with ID:', firebaseDoc.id);

        // Save to Supabase
        console.log('Saving approval request to Supabase...');
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('approval_requests')
          .insert({
            type: approvalRequestData.type,
            title: approvalRequestData.title,
            description: approvalRequestData.description,
            amount: approvalRequestData.amount,
            department: approvalRequestData.department,
            requestedby: approvalRequestData.requestedby,
            daterequested: approvalRequestData.daterequested,
            priority: approvalRequestData.priority,
            status: approvalRequestData.status,
            details: approvalRequestData.details
          })
          .select()
          .single();

        if (supabaseError) {
          console.error('Error saving approval request to Supabase:', supabaseError);
          throw supabaseError;
        }

        console.log('Supabase approval request created:', supabaseData);

        // Update payment status to Processing in Firebase
        console.log('Updating payment status to Processing in Firebase...');
        const paymentsSnapshot = await getDocs(query(collection(db, 'payment_records')));
        const paymentDoc = paymentsSnapshot.docs.find(doc => doc.id === paymentId);
        
        if (paymentDoc) {
          await updateDoc(doc(db, 'payment_records', paymentDoc.id), {
            status: 'Processing',
            updated_at: new Date().toISOString()
          });
          console.log('Payment status updated to Processing in Firebase');
        }

        // Update in Supabase
        const { error: updateError } = await supabase
          .from('payment_records')
          .update({ 
            status: 'Processing',
            updated_at: new Date().toISOString()
          })
          .eq('supplier', payment.supplier)
          .eq('amount', payment.amount);

        if (updateError) {
          console.error('Error updating payment status in Supabase:', updateError);
        } else {
          console.log('Payment status updated to Processing in Supabase');
        }
        
        await recordDailyTask(
          'Payment Request',
          `Bank transfer approval requested for ${payment.supplier} - UGX ${payment.amount.toLocaleString()}`,
          payment.amount,
          payment.batchNumber
        );

        toast({
          title: "Approval Request Submitted",
          description: `Bank transfer of UGX ${payment.amount.toLocaleString()} has been submitted for manager approval`
        });

        console.log('Bank transfer approval request process completed successfully');
      } else {
        // Cash payment - process immediately
        console.log('Processing cash payment...');
        
        // Update payment status to Paid for cash payments in Firebase
        const paymentsSnapshot = await getDocs(query(collection(db, 'payment_records')));
        const paymentDoc = paymentsSnapshot.docs.find(doc => doc.id === paymentId);
        
        if (paymentDoc) {
          await updateDoc(doc(db, 'payment_records', paymentDoc.id), {
            status: 'Paid',
            method: 'Cash',
            updated_at: new Date().toISOString()
          });
          console.log('Cash payment status updated to Paid in Firebase');
        }

        // Update payment status to Paid for cash payments in Supabase
        const { error: updateError } = await supabase
          .from('payment_records')
          .update({ 
            status: 'Paid',
            method: 'Cash',
            updated_at: new Date().toISOString()
          })
          .eq('supplier', payment.supplier)
          .eq('amount', payment.amount);

        if (updateError) {
          console.error('Error updating cash payment status:', updateError);
        } else {
          console.log('Cash payment status updated to Paid in Supabase');
        }
        
        await recordDailyTask(
          'Payment',
          `Cash payment to ${payment.supplier} - UGX ${payment.amount.toLocaleString()}`,
          payment.amount,
          payment.batchNumber
        );

        toast({
          title: "Cash Payment Processed",
          description: `Cash payment of UGX ${payment.amount.toLocaleString()} has been processed successfully`
        });

        console.log('Cash payment processed successfully');
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (transaction: Omit<FinanceTransaction, 'id'>) => {
    try {
      console.log('Adding transaction to both databases:', transaction);
      
      // Save to Firebase
      await addDoc(collection(db, 'finance_transactions'), {
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Save to Supabase
      await supabase.from('finance_transactions').insert({
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        time: transaction.time,
        date: transaction.date
      });
      
      await recordDailyTask(
        transaction.type,
        transaction.description,
        transaction.amount
      );

      toast({
        title: "Success",
        description: `${transaction.type} recorded successfully`
      });

      await fetchFinanceData();
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
      console.log('Adding expense to both databases:', expense);
      
      // Save to Firebase
      await addDoc(collection(db, 'finance_expenses'), {
        ...expense,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Save to Supabase
      await supabase.from('finance_expenses').insert({
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        status: expense.status
      });
      
      await recordDailyTask(
        'Expense',
        `${expense.description} - ${expense.category}`,
        expense.amount
      );

      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });

      await fetchFinanceData();
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
    console.log('useFinanceData: Starting data fetch on mount');
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
