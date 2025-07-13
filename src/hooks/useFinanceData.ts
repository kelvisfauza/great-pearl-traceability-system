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
      console.log('Daily task recorded successfully');
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
      try {
        const transactionsQuery = query(collection(db, 'finance_transactions'), orderBy('created_at', 'desc'));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinanceTransaction[];
        console.log('Finance transactions loaded:', transactionsData.length, 'records');
        setTransactions(transactionsData);
      } catch (transactionError) {
        console.error('Error fetching transactions:', transactionError);
        setTransactions([]);
      }

      // Fetch expenses from Firebase
      console.log('Fetching finance expenses from Firebase...');
      try {
        const expensesQuery = query(collection(db, 'finance_expenses'), orderBy('created_at', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinanceExpense[];
        console.log('Finance expenses loaded:', expensesData.length, 'records');
        setExpenses(expensesData);
      } catch (expenseError) {
        console.error('Error fetching expenses:', expenseError);
        setExpenses([]);
      }

      // Fetch payment records from Firebase
      console.log('Fetching payment records from Firebase...');
      try {
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
      } catch (paymentError) {
        console.error('Error fetching payment records:', paymentError);
        setPayments([]);
      }

      // Fetch quality assessments from Firebase - with better error handling
      console.log('Fetching quality assessments for finance from Firebase...');
      try {
        const assessmentsQuery = query(collection(db, 'quality_assessments'), orderBy('created_at', 'desc'));
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        
        if (assessmentsSnapshot.empty) {
          console.log('No quality assessments found');
          setQualityAssessments([]);
        } else {
          const allAssessments = assessmentsSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Processing assessment:', doc.id, data);
            return {
              id: doc.id,
              store_record_id: data.store_record_id || null,
              batch_number: data.batch_number || '',
              moisture: Number(data.moisture) || 0,
              group1_defects: Number(data.group1_defects) || 0,
              group2_defects: Number(data.group2_defects) || 0,
              below12: Number(data.below12) || 0,
              pods: Number(data.pods) || 0,
              husks: Number(data.husks) || 0,
              stones: Number(data.stones) || 0,
              suggested_price: Number(data.suggested_price) || 0,
              status: data.status || 'assessed',
              comments: data.comments || null,
              date_assessed: data.date_assessed || new Date().toISOString().split('T')[0],
              assessed_by: data.assessed_by || 'Quality Officer',
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString()
            };
          }) as QualityAssessmentForPayment[];
          
          // Filter for assessments relevant to finance
          const relevantAssessments = allAssessments.filter(assessment => {
            const isRelevant = assessment.status && 
              ['submitted_to_finance', 'price_requested', 'approved'].includes(assessment.status);
            console.log(`Assessment ${assessment.id} (${assessment.status}) is relevant:`, isRelevant);
            return isRelevant;
          });
          
          console.log('Quality assessments for finance loaded:', relevantAssessments.length, 'relevant out of', allAssessments.length, 'total');
          setQualityAssessments(relevantAssessments);
        }
      } catch (assessmentError) {
        console.error('Error fetching quality assessments:', assessmentError);
        setQualityAssessments([]);
      }
      
      // Update stats with better error handling
      try {
        const currentTransactions = transactions.length > 0 ? transactions : [];
        const currentPayments = payments.length > 0 ? payments : [];
        const currentExpenses = expenses.length > 0 ? expenses : [];
        
        const totalReceipts = currentTransactions
          .filter(t => t.type === 'Receipt' || t.type === 'Float')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
        const totalPayments = currentTransactions
          .filter(t => t.type === 'Payment' || t.type === 'Expense')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const pendingPayments = currentPayments
          .filter(p => p.status === 'Pending')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          
        const operatingCosts = currentExpenses
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        setStats(prev => ({
          ...prev,
          totalReceipts,
          totalPayments,
          netCashFlow: totalReceipts - totalPayments,
          pendingPayments,
          operatingCosts
        }));
        
        console.log('Finance stats updated:', {
          totalReceipts,
          totalPayments,
          netCashFlow: totalReceipts - totalPayments,
          pendingPayments,
          operatingCosts
        });
      } catch (statsError) {
        console.error('Error updating stats:', statsError);
      }
      
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

  const createPaymentFromQualityAssessment = async (assessmentId: string) => {
    try {
      console.log('Creating payment record from quality assessment:', assessmentId);
      
      const assessment = qualityAssessments.find(a => a.id === assessmentId);
      if (!assessment) {
        console.error('Quality assessment not found:', assessmentId);
        throw new Error('Quality assessment not found');
      }

      console.log('Found assessment:', assessment);

      // Fetch the coffee record to get supplier and quantity info
      console.log('Fetching coffee record for batch:', assessment.batch_number);
      const coffeeRecordsQuery = query(
        collection(db, 'coffee_records'),
        where('batch_number', '==', assessment.batch_number)
      );
      const coffeeRecordsSnapshot = await getDocs(coffeeRecordsQuery);
      
      if (coffeeRecordsSnapshot.empty) {
        console.error('No coffee record found for batch:', assessment.batch_number);
        throw new Error('Coffee record not found for batch');
      }

      const coffeeRecord = coffeeRecordsSnapshot.docs[0].data();
      console.log('Found coffee record:', coffeeRecord);
      
      const totalAmount = assessment.suggested_price * coffeeRecord.kilograms;
      console.log('Calculated total amount:', totalAmount);

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

      console.log('Creating payment record:', paymentRecord);
      const docRef = await addDoc(collection(db, 'payment_records'), paymentRecord);
      console.log('Payment record created with ID:', docRef.id);
      
      await recordDailyTask(
        'Payment Record Created',
        `Payment record created for ${coffeeRecord.supplier_name} - UGX ${totalAmount.toLocaleString()}`,
        totalAmount,
        assessment.batch_number
      );
      
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
        description: `Failed to create payment record: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    createPaymentFromQualityAssessment,
    refetch: fetchFinanceData
  };
};
