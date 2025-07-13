import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  status: string;
  method: string;
  date: string;
  batchNumber?: string;
  qualityAssessmentId?: string;
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
    monthlyRevenue: 0,
    pendingPayments: 0,
    operatingCosts: 0,
    cashOnHand: 0,
    currentFloat: 0,
    totalReceipts: 0,
    totalPayments: 0,
    netCashFlow: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      console.log('Fetching finance data from Firebase...');

      // Fetch transactions
      try {
        const transactionsQuery = query(collection(db, 'finance_transactions'), orderBy('created_at', 'desc'));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinanceTransaction[];
        console.log('Transactions fetched:', transactionsData.length);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      }

      // Fetch expenses
      try {
        const expensesQuery = query(collection(db, 'finance_expenses'), orderBy('created_at', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinanceExpense[];
        console.log('Expenses fetched:', expensesData.length);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      }

      // Fetch payment records AND quality assessments to create payment records
      await fetchPaymentRecords();

      // Calculate stats (using sample data if collections are empty)
      const sampleStats: FinanceStats = {
        monthlyRevenue: 15750000,
        pendingPayments: 2340000,
        operatingCosts: 8500000,
        cashOnHand: 5200000,
        currentFloat: 500000,
        totalReceipts: 12450000,
        totalPayments: 6780000,
        netCashFlow: 5670000
      };
      
      setStats(sampleStats);
      console.log('Finance data loaded successfully');

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

  const fetchPaymentRecords = async () => {
    try {
      console.log('Fetching payment records and quality assessments...');
      
      // Fetch existing payment records
      const paymentsQuery = query(collection(db, 'payment_records'), orderBy('created_at', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const existingPayments = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          supplier: data.supplier || '',
          amount: data.amount || 0,
          status: data.status || 'Pending',
          method: data.method || 'Bank Transfer',
          date: data.date || new Date().toLocaleDateString(),
          batchNumber: data.batchNumber || data.batch_number || '', // Handle both field names
          qualityAssessmentId: data.qualityAssessmentId || data.quality_assessment_id || null,
          ...data
        } as PaymentRecord;
      });
      
      console.log('Existing payment records:', existingPayments.length);

      // Fetch quality assessments that are ready for payment
      const qualityQuery = query(
        collection(db, 'quality_assessments'),
        where('status', 'in', ['assessed', 'submitted_to_finance'])
      );
      const qualitySnapshot = await getDocs(qualityQuery);
      const qualityAssessments = qualitySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batch_number: data.batch_number || '',
          suggested_price: data.suggested_price || 0,
          status: data.status || 'assessed',
          created_at: data.created_at || new Date().toISOString(),
          store_record_id: data.store_record_id || null,
          ...data
        };
      });
      
      // Sort in memory by created_at (most recent first)
      qualityAssessments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('Quality assessments ready for payment:', qualityAssessments.length);

      // Fetch coffee records to get supplier names
      const coffeeRecordsQuery = query(collection(db, 'coffee_records'));
      const coffeeRecordsSnapshot = await getDocs(coffeeRecordsQuery);
      const coffeeRecords = coffeeRecordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batch_number: data.batch_number || '',
          supplier_name: data.supplier_name || '',
          ...data
        };
      });

      // Create payment records for quality assessments that don't have them yet
      const newPayments: PaymentRecord[] = [];
      
      for (const assessment of qualityAssessments) {
        // Check if payment record already exists for this assessment
        const existingPayment = existingPayments.find(p => p.qualityAssessmentId === assessment.id);
        
        if (!existingPayment) {
          console.log('Creating payment record for assessment:', assessment.id);
          
          // Find the corresponding coffee record to get supplier name
          const coffeeRecord = coffeeRecords.find(record => 
            record.id === assessment.store_record_id || 
            record.batch_number === assessment.batch_number
          );
          
          const supplierName = coffeeRecord?.supplier_name || `Supplier for Batch ${assessment.batch_number}`;
          
          // Create new payment record
          const paymentRecord = {
            supplier: supplierName, // Use actual supplier name, not batch number
            amount: assessment.suggested_price || 0,
            status: 'Pending',
            method: 'Bank Transfer',
            date: new Date().toLocaleDateString(),
            batchNumber: assessment.batch_number || '',
            qualityAssessmentId: assessment.id
          };

          try {
            const docRef = await addDoc(collection(db, 'payment_records'), {
              ...paymentRecord,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            newPayments.push({
              id: docRef.id,
              ...paymentRecord
            });

            console.log('Created payment record:', docRef.id);
          } catch (error) {
            console.error('Error creating payment record:', error);
          }
        }
      }

      // Combine existing and new payment records
      const allPayments = [...existingPayments, ...newPayments];
      console.log('Total payment records:', allPayments.length);
      setPayments(allPayments);

    } catch (error) {
      console.error('Error fetching payment records:', error);
      setPayments([]);
    }
  };

  const addTransaction = async (transaction: Omit<FinanceTransaction, 'id'>) => {
    try {
      console.log('Adding transaction:', transaction);
      await addDoc(collection(db, 'finance_transactions'), {
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
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
      console.log('Adding expense:', expense);
      await addDoc(collection(db, 'finance_expenses'), {
        ...expense,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: "Success",
        description: "Expense recorded successfully",
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

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    try {
      console.log('Processing payment:', paymentId, method);
      
      // Find the payment record to get quality assessment ID
      const payment = payments.find(p => p.id === paymentId);
      
      if (method === 'Bank Transfer') {
        // For bank transfers, create approval request
        await addDoc(collection(db, 'approval_requests'), {
          department: 'Finance',
          type: 'Bank Transfer',
          title: 'Bank Transfer Approval Required',
          description: `Bank transfer payment request for batch: ${payment?.batchNumber || 'Unknown'}`,
          amount: payment?.amount?.toLocaleString() || 'Pending Review',
          requestedby: 'Finance Department',
          daterequested: new Date().toISOString(),
          priority: 'High',
          status: 'Pending',
          details: {
            paymentId,
            method: 'Bank Transfer',
            supplier: payment?.supplier,
            amount: payment?.amount,
            batchNumber: payment?.batchNumber
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Update payment status to Processing
        await updateDoc(doc(db, 'payment_records', paymentId), {
          status: 'Processing',
          method: 'Bank Transfer',
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Bank transfer submitted for approval",
        });
      } else {
        // For cash payments, mark as paid immediately
        await updateDoc(doc(db, 'payment_records', paymentId), {
          status: 'Paid',
          method: 'Cash',
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Cash payment processed successfully",
        });
      }

      // Update quality assessment status to "sent_to_finance" if we have the assessment ID
      if (payment?.qualityAssessmentId) {
        console.log('Updating quality assessment status to sent_to_finance:', payment.qualityAssessmentId);
        try {
          await updateDoc(doc(db, 'quality_assessments', payment.qualityAssessmentId), {
            status: 'sent_to_finance',
            updated_at: new Date().toISOString()
          });
          console.log('Quality assessment status updated successfully');
        } catch (error) {
          console.error('Error updating quality assessment status:', error);
        }
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
    refetch: fetchFinanceData
  };
};
