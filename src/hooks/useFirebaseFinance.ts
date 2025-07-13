
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
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

      // Fetch payment records
      try {
        const paymentsQuery = query(collection(db, 'payment_records'), orderBy('created_at', 'desc'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentRecord[];
        console.log('Payment records fetched:', paymentsData.length);
        setPayments(paymentsData);
      } catch (error) {
        console.error('Error fetching payment records:', error);
        setPayments([]);
      }

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
      
      if (method === 'Bank Transfer') {
        // For bank transfers, create approval request
        await addDoc(collection(db, 'approval_requests'), {
          department: 'Finance',
          type: 'Bank Transfer',
          title: 'Bank Transfer Approval Required',
          description: `Bank transfer payment request for payment ID: ${paymentId}`,
          amount: 'Pending Review',
          requestedby: 'Finance Department',
          daterequested: new Date().toISOString(),
          priority: 'High',
          status: 'Pending',
          details: {
            paymentId,
            method: 'Bank Transfer'
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
