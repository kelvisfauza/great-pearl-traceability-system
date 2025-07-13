
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    } catch (error) {
      console.error('Error recording daily task:', error);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions from Firebase
      console.log('Fetching finance transactions from Firebase...');
      const transactionsQuery = query(collection(db, 'finance_transactions'), orderBy('created_at', 'desc'));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinanceTransaction[];
      console.log('Finance transactions loaded:', transactionsData);
      setTransactions(transactionsData);

      // Fetch expenses from Firebase
      console.log('Fetching finance expenses from Firebase...');
      const expensesQuery = query(collection(db, 'finance_expenses'), orderBy('created_at', 'desc'));
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinanceExpense[];
      console.log('Finance expenses loaded:', expensesData);
      setExpenses(expensesData);

      // Fetch payment records from Firebase
      console.log('Fetching payment records from Firebase...');
      const paymentsQuery = query(collection(db, 'payment_records'), orderBy('created_at', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
      console.log('Payment records loaded:', paymentsData);
      setPayments(paymentsData);

      // Fetch quality assessments from Firebase for payment processing
      console.log('Fetching quality assessments for finance from Firebase...');
      const assessmentsQuery = query(
        collection(db, 'quality_assessments'), 
        where('status', 'in', ['submitted_to_finance', 'price_requested', 'approved']),
        orderBy('created_at', 'desc')
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentsData = assessmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QualityAssessmentForPayment[];
      console.log('Quality assessments for finance loaded:', assessmentsData);
      setQualityAssessments(assessmentsData);
      
      // Update stats
      const totalReceipts = transactionsData
        .filter(t => t.type === 'Receipt' || t.type === 'Float')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalPayments = transactionsData
        .filter(t => t.type === 'Payment' || t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats(prev => ({
        ...prev,
        totalReceipts,
        totalPayments,
        netCashFlow: totalReceipts - totalPayments,
        pendingPayments: paymentsData.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0),
        operatingCosts: expensesData.reduce((sum, e) => sum + e.amount, 0)
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

  const createPaymentFromQualityAssessment = async (assessmentId: string) => {
    try {
      console.log('Creating payment record from quality assessment:', assessmentId);
      
      const assessment = qualityAssessments.find(a => a.id === assessmentId);
      if (!assessment) {
        throw new Error('Quality assessment not found');
      }

      // Fetch the coffee record to get supplier and quantity info
      const coffeeRecordsQuery = query(
        collection(db, 'coffee_records'),
        where('batch_number', '==', assessment.batch_number)
      );
      const coffeeRecordsSnapshot = await getDocs(coffeeRecordsQuery);
      
      if (coffeeRecordsSnapshot.empty) {
        throw new Error('Coffee record not found for batch');
      }

      const coffeeRecord = coffeeRecordsSnapshot.docs[0].data();
      const totalAmount = assessment.suggested_price * coffeeRecord.kilograms;

      const paymentRecord = {
        supplier: coffeeRecord.supplier_name,
        amount: totalAmount,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        method: 'Bank Transfer',
        quality_assessment_id: assessmentId,
        batch_number: assessment.batch_number,
        kilograms: coffeeRecord.kilograms,
        price_per_kg: assessment.suggested_price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'payment_records'), paymentRecord);
      
      toast({
        title: "Payment Record Created",
        description: `Payment record created for ${coffeeRecord.supplier_name} - UGX ${totalAmount.toLocaleString()}`
      });

      // Refresh data
      await fetchFinanceData();
      
    } catch (error) {
      console.error('Error creating payment from quality assessment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment record",
        variant: "destructive"
      });
    }
  };

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      console.log('Processing payment:', paymentId, method);
      
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment record not found');

      if (method === 'Bank Transfer') {
        // Create approval request in Firebase
        await addDoc(collection(db, 'approval_requests'), {
          type: 'Bank Transfer',
          title: `Bank transfer to ${payment.supplier}`,
          description: `Payment to ${payment.supplier} - UGX ${payment.amount.toLocaleString()}`,
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
            batchNumber: payment.batchNumber
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
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

      await fetchFinanceData();
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
      console.log('Adding transaction to Firebase:', transaction);
      
      await addDoc(collection(db, 'finance_transactions'), {
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      console.log('Adding expense to Firebase:', expense);
      
      await addDoc(collection(db, 'finance_expenses'), {
        ...expense,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    createPaymentFromQualityAssessment,
    refetch: fetchFinanceData
  };
};
