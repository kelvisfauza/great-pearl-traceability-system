import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firebaseClient } from '@/lib/firebaseClient';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from './useNotifications';

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
  totalAdvancesGiven?: number;
}

interface ApprovalRequestDetails {
  paymentId?: string;
  method?: string;
  supplier?: string;
  amount?: number;
  batchNumber?: string;
}

interface ApprovalRequestData {
  id: string;
  type: string;
  status: string;
  details?: ApprovalRequestDetails;
  [key: string]: any;
}

export const useFirebaseFinance = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [supplierAdvances, setSupplierAdvances] = useState<any[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    monthlyRevenue: 0,
    pendingPayments: 0,
    operatingCosts: 0,
    cashOnHand: 0,
    currentFloat: 0,
    totalReceipts: 0,
    totalPayments: 0,
    netCashFlow: 0,
    totalAdvancesGiven: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { createApprovalCompleteNotification } = useNotifications();

  const calculateRealStats = (transactionsData: FinanceTransaction[], expensesData: FinanceExpense[], advancesData: any[]) => {
    console.log('Calculating real stats from data...');
    
    // Calculate monthly revenue from transactions
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = transactionsData
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear &&
               t.type === 'Income';
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate pending payments
    const pendingPayments = payments
      .filter(p => p.status === 'Pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate operating costs from expenses
    const operatingCosts = expensesData
      .filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate cash on hand from transactions
    const totalIncome = transactionsData
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalExpenses = transactionsData
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const cashOnHand = totalIncome - totalExpenses;

    // Calculate current float from transactions
    const currentFloat = transactionsData
      .filter(t => t.type === 'Float')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate total receipts
    const totalReceipts = transactionsData
      .filter(t => t.type === 'Receipt')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate total payments made
    const totalPayments = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate net cash flow
    const netCashFlow = totalIncome - totalExpenses - totalPayments;

    // Calculate total advances given
    const totalAdvancesGiven = advancesData
      .filter(a => a.status === 'Active')
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    const calculatedStats: FinanceStats = {
      monthlyRevenue,
      pendingPayments,
      operatingCosts,
      cashOnHand,
      currentFloat,
      totalReceipts,
      totalPayments,
      netCashFlow,
      totalAdvancesGiven
    };

    console.log('Calculated stats:', calculatedStats);
    setStats(calculatedStats);
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      console.log('Fetching finance data from Firebase...');

      // Initialize data arrays
      let transactionsData: FinanceTransaction[] = [];
      let expensesData: FinanceExpense[] = [];
      let advancesData: any[] = [];

      // Fetch transactions
      try {
        const transactionsQuery = query(collection(db, 'finance_transactions'), orderBy('created_at', 'desc'));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        transactionsData = transactionsSnapshot.docs.map(doc => ({
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
        expensesData = expensesSnapshot.docs.map(doc => ({
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

      // Fetch supplier advances
      try {
        const advancesQuery = query(collection(db, 'supplier_advances'), orderBy('created_at', 'desc'));
        const advancesSnapshot = await getDocs(advancesQuery);
        advancesData = advancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSupplierAdvances(advancesData);
      } catch (error) {
        console.error('Error fetching advances:', error);
        setSupplierAdvances([]);
      }

      // If no Firebase data exists, create some sample transactions for demo
      if (transactionsData.length === 0) {
        console.log('No Firebase data found, creating sample data for demo...');
        transactionsData = [
          {
            id: 'demo-1',
            type: 'Income',
            description: 'Coffee sales revenue',
            amount: 15000000,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          },
          {
            id: 'demo-2', 
            type: 'Float',
            description: 'Daily cash float',
            amount: 2000000,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          }
        ];
        setTransactions(transactionsData);
      }

      // Calculate real stats from actual data after everything is fetched
      // Use a timeout to ensure payments state is updated
      setTimeout(() => {
        calculateRealStats(transactionsData, expensesData, advancesData);
      }, 100);
      
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
      
      // First, fetch coffee records to get supplier names and kilograms
      const coffeeRecordsQuery = query(collection(db, 'coffee_records'));
      const coffeeRecordsSnapshot = await getDocs(coffeeRecordsQuery);
      const coffeeRecords = coffeeRecordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batch_number: data.batch_number || '',
          supplier_name: data.supplier_name || '',
          kilograms: data.kilograms || 0,
          ...data
        };
      });
      console.log('Coffee records fetched:', coffeeRecords.length);

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
          batchNumber: data.batchNumber || data.batch_number || '',
          qualityAssessmentId: data.qualityAssessmentId || data.quality_assessment_id || null,
          paid_amount: data.paid_amount || 0,
          rejection_reason: data.rejection_reason || null,
          rejection_comments: data.rejection_comments || null,
          ...data
        } as PaymentRecord;
      });
      
      console.log('Existing payment records:', existingPayments.length);

      // Fix existing payment records that have batch numbers as supplier names
      for (const payment of existingPayments) {
        if (payment.supplier.startsWith('BATCH') && payment.batchNumber) {
          // Find the corresponding coffee record
          const coffeeRecord = coffeeRecords.find(record => 
            record.batch_number === payment.batchNumber
          );
          
          if (coffeeRecord && coffeeRecord.supplier_name) {
            console.log('Updating payment record supplier from', payment.supplier, 'to', coffeeRecord.supplier_name);
            
            try {
              await updateDoc(doc(db, 'payment_records', payment.id), {
                supplier: coffeeRecord.supplier_name,
                updated_at: new Date().toISOString()
              });
              
              // Update local state
              payment.supplier = coffeeRecord.supplier_name;
            } catch (error) {
              console.error('Error updating payment record supplier:', error);
            }
          }
        }
      }

      // Check for approved bank transfer requests and update payment status
      const approvalQuery = query(
        collection(db, 'approval_requests'),
        where('type', '==', 'Bank Transfer'),
        where('status', '==', 'Approved')
      );
      const approvalSnapshot = await getDocs(approvalQuery);
      const approvedRequests = approvalSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || '',
          status: data.status || '',
          details: data.details || {},
          ...data
        } as ApprovalRequestData;
      });

      // Update payment records based on approved requests
      for (const request of approvedRequests) {
        if (request.details?.paymentId) {
          const paymentToUpdate = existingPayments.find(p => p.id === request.details?.paymentId);
          if (paymentToUpdate && paymentToUpdate.status === 'Processing') {
            try {
              await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
                status: 'Paid',
                updated_at: new Date().toISOString()
              });
              
              // Update local state
              paymentToUpdate.status = 'Paid';
              console.log('Updated payment status to Paid for:', request.details.paymentId);
              
              // Create approval notification for store/supplier
              await createApprovalCompleteNotification(
                'Payment Approved & Processed',
                `Payment for ${paymentToUpdate.supplier} (Batch: ${paymentToUpdate.batchNumber})`,
                'Finance Administrator',
                paymentToUpdate.amount,
                'Store'
              );
            } catch (error) {
              console.error('Error updating payment status:', error);
            }
          }
        }
      }

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

      // Create payment records for quality assessments that don't have them yet
      const newPayments: PaymentRecord[] = [];
      
      for (const assessment of qualityAssessments) {
        // Check if payment record already exists for this assessment
        const existingPayment = existingPayments.find(p => p.qualityAssessmentId === assessment.id);
        
        if (!existingPayment) {
          console.log('Creating payment record for assessment:', assessment.id, 'batch:', assessment.batch_number);
          
          // Find the corresponding coffee record to get supplier name and kilograms
          const coffeeRecord = coffeeRecords.find(record => 
            record.id === assessment.store_record_id || 
            record.batch_number === assessment.batch_number
          );
          
          const supplierName = coffeeRecord?.supplier_name || 'Unknown Supplier';
          const kilograms = coffeeRecord?.kilograms || 0;
          
          // Calculate total payment amount: kilograms × price per kg
          const totalPaymentAmount = kilograms * assessment.suggested_price;
          
          console.log('Found coffee record for batch', assessment.batch_number, ':', coffeeRecord);
          console.log('Payment calculation:', {
            kilograms,
            pricePerKg: assessment.suggested_price,
            totalAmount: totalPaymentAmount
          });
          
          // Create new payment record with correct supplier name and calculated amount
          const paymentRecord = {
            supplier: supplierName,
            amount: totalPaymentAmount, // This is now kilograms × price per kg
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

            console.log('Created payment record with supplier:', supplierName, 'amount:', totalPaymentAmount, 'batch:', assessment.batch_number);
          } catch (error) {
            console.error('Error creating payment record:', error);
          }
        }
      }

      // Combine existing and new payment records
      const allPayments = [...existingPayments, ...newPayments];
      console.log('Total payment records:', allPayments.length);
      
      // Log each payment record for debugging
      allPayments.forEach(payment => {
        console.log('Payment record:', {
          id: payment.id,
          supplier: payment.supplier,
          amount: payment.amount,
          batchNumber: payment.batchNumber,
          status: payment.status,
          rejectionReason: payment.rejection_reason
        });
      });
      
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
      
      // Immediately update local state for instant feedback
      const newTransaction = {
        id: 'temp-' + Date.now(),
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setTransactions(prev => [...prev, newTransaction]);
      
      // Recalculate stats immediately
      const currentTransactions = [...transactions, newTransaction];
      calculateRealStats(currentTransactions, expenses, supplierAdvances);
      
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
      });
      
      // Fetch fresh data from Firebase
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

  const processPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash', actualAmount?: number) => {
    try {
      console.log('🔄 Processing payment with ID:', paymentId);
      console.log('🔄 Method:', method, 'Actual Amount:', actualAmount);
      console.log('🔄 Current payments in state:', payments.length);
      
      // Debug: Log all payment IDs in current state
      console.log('🔍 Payment IDs in state:', payments.map(p => ({ id: p.id, supplier: p.supplier, status: p.status })));
      
      // Find the payment record to get quality assessment ID
      let payment = payments.find(p => p.id === paymentId);
      console.log('🔍 Payment found in local state:', !!payment, payment ? payment.supplier : 'N/A');
      
      // If not found in local state, refresh data first and try again
      if (!payment) {
        console.log('⚠️ Payment not found in local state, refreshing payment records...');
        await fetchPaymentRecords();
        
        // Try again after refresh
        payment = payments.find(p => p.id === paymentId);
        console.log('🔍 After refresh - Payment found:', !!payment);
        
        if (!payment) {
          console.log('⚠️ Still not found after refresh, fetching directly from Firebase...');
          try {
            const paymentDoc = await getDoc(doc(db, 'payment_records', paymentId));
            if (paymentDoc.exists()) {
              const data = paymentDoc.data();
              payment = {
                id: paymentDoc.id,
                supplier: data.supplier || '',
                amount: data.amount || 0,
                status: data.status || 'Pending',
                method: data.method || 'Bank Transfer',
                date: data.date || new Date().toLocaleDateString(),
                batchNumber: data.batchNumber || data.batch_number || '',
                qualityAssessmentId: data.qualityAssessmentId || data.quality_assessment_id || null,
                paid_amount: data.paid_amount || 0,
                rejection_reason: data.rejection_reason || null,
                rejection_comments: data.rejection_comments || null,
                ...data
              } as PaymentRecord;
              console.log('✅ Payment fetched directly from Firebase:', {
                id: payment.id,
                supplier: payment.supplier,
                amount: payment.amount,
                status: payment.status,
                batchNumber: payment.batchNumber
              });
            } else {
              console.error('❌ Payment document does not exist in Firebase. ID:', paymentId);
              
              // Debug: List all payment documents in Firebase
              console.log('🔍 Checking all payment records in Firebase...');
              const allPaymentsSnapshot = await getDocs(collection(db, 'payment_records'));
              const allPaymentIds = allPaymentsSnapshot.docs.map(doc => ({
                id: doc.id,
                supplier: doc.data().supplier,
                batchNumber: doc.data().batchNumber || doc.data().batch_number
              }));
              console.log('🔍 All payment records in Firebase:', allPaymentIds);
            }
          } catch (firebaseError) {
            console.error('❌ Error fetching payment from Firebase:', firebaseError);
            toast({
              title: "Database Error", 
              description: "Failed to fetch payment record from database. Please try again.",
              variant: "destructive"
            });
            return;
          }
        }
      }
      
      if (!payment) {
        console.error('❌ Payment record not found anywhere. ID:', paymentId);
        toast({
          title: "Payment Not Found",
          description: `Payment record with ID ${paymentId} could not be found. Please refresh the page and try again.`,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Payment record located:', {
        id: payment.id,
        supplier: payment.supplier,
        amount: payment.amount,
        status: payment.status,
        batchNumber: payment.batchNumber,
        qualityAssessmentId: payment.qualityAssessmentId
      });
      
      if (method === 'Bank Transfer') {
        // For bank transfers, create approval request
        console.log('Creating bank transfer approval request...');
        await addDoc(collection(db, 'approval_requests'), {
          department: 'Finance',
          type: 'Bank Transfer',
          title: 'Bank Transfer Approval Required',
          description: `Bank transfer payment request for ${payment.supplier} - Batch: ${payment.batchNumber || 'Unknown'}`,
          amount: payment.amount?.toLocaleString() || 'Pending Review',
          requestedby: 'Finance Department',
          daterequested: new Date().toISOString(),
          priority: 'High',
          status: 'Pending',
          details: {
            paymentId,
            method: 'Bank Transfer',
            supplier: payment.supplier,
            amount: payment.amount,
            batchNumber: payment.batchNumber,
            qualityAssessmentId: payment.qualityAssessmentId
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Update payment status to Processing (not Rejected)
        console.log('Updating payment status to Processing...');
        await updateDoc(doc(db, 'payment_records', paymentId), {
          status: 'Processing',
          method: 'Bank Transfer',
          updated_at: new Date().toISOString()
        });

        // Update local state immediately
        setPayments(prevPayments => 
          prevPayments.map(p => 
            p.id === paymentId 
              ? { ...p, status: 'Processing', method: 'Bank Transfer' }
              : p
          )
        );

        // Record daily task
        await addDoc(collection(db, 'daily_tasks'), {
          task_type: 'Bank Transfer Request',
          description: `Bank transfer requested: ${payment.supplier} - UGX ${payment.amount?.toLocaleString()}`,
          amount: payment.amount,
          batch_number: payment.batchNumber,
          completed_by: 'Finance Department',
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          department: 'Finance',
          created_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Bank transfer submitted for approval",
        });
      } else {
        // For cash payments, handle partial payments
        const originalAmount = payment.amount;
        const previouslyPaid = payment.paid_amount || 0;
        const amountBeingPaid = actualAmount || originalAmount;
        const totalPaid = previouslyPaid + amountBeingPaid;
        const remainingBalance = originalAmount - totalPaid;
        
        console.log('Cash payment calculation:', {
          originalAmount,
          previouslyPaid,
          amountBeingPaid,
          totalPaid,
          remainingBalance
        });

        // Determine new status based on payment completion
        let newStatus = 'Paid';
        if (remainingBalance > 0) {
          newStatus = 'Partial';
        }

        console.log('Processing cash payment with status:', newStatus);
        await updateDoc(doc(db, 'payment_records', paymentId), {
          status: newStatus,
          method: 'Cash',
          paid_amount: totalPaid,
          updated_at: new Date().toISOString()
        });

        // Update local state immediately
        setPayments(prevPayments => 
          prevPayments.map(p => 
            p.id === paymentId 
              ? { ...p, status: newStatus, method: 'Cash', paid_amount: totalPaid }
              : p
          )
        );

        // Record daily task
        const taskDescription = remainingBalance > 0 
          ? `Partial cash payment: ${payment.supplier} - UGX ${amountBeingPaid.toLocaleString()} (Balance: UGX ${remainingBalance.toLocaleString()})`
          : `Cash payment completed: ${payment.supplier} - UGX ${amountBeingPaid.toLocaleString()}`;

        await addDoc(collection(db, 'daily_tasks'), {
          task_type: remainingBalance > 0 ? 'Partial Cash Payment' : 'Cash Payment',
          description: taskDescription,
          amount: amountBeingPaid,
          batch_number: payment.batchNumber,
          completed_by: 'Finance Department',
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          department: 'Finance',
          created_at: new Date().toISOString()
        });

        const successMessage = remainingBalance > 0 
          ? `Partial payment processed. Remaining balance: UGX ${remainingBalance.toLocaleString()}`
          : "Cash payment processed successfully";

        toast({
          title: "Success",
          description: successMessage,
        });
      }

      // Update quality assessment status based on payment completion
      if (payment.qualityAssessmentId) {
        let assessmentStatus = 'submitted_to_finance'; // Default for processing payments
        
        // For cash payments, mark as payment_processed if fully paid
        if (method === 'Cash') {
          const originalAmount = payment.amount;
          const previouslyPaid = payment.paid_amount || 0;
          const amountBeingPaid = actualAmount || originalAmount;
          const totalPaid = previouslyPaid + amountBeingPaid;
          const remainingBalance = originalAmount - totalPaid;
          
          if (remainingBalance <= 0) {
            assessmentStatus = 'payment_processed';
          }
        }
        
        console.log(`Updating quality assessment status to ${assessmentStatus}:`, payment.qualityAssessmentId);
        try {
          // Try updating in Supabase first (preferred)
          const { error: supabaseError } = await supabase
            .from('quality_assessments')
            .update({ 
              status: assessmentStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.qualityAssessmentId);
            
          if (supabaseError) {
            console.log('Supabase update failed, trying Firebase:', supabaseError);
            // Fallback to Firebase if Supabase fails
            await updateDoc(doc(db, 'quality_assessments', payment.qualityAssessmentId), {
              status: assessmentStatus,
              updated_at: new Date().toISOString()
            });
          }
          console.log('Quality assessment status updated successfully');
        } catch (error) {
          console.error('Error updating quality assessment status:', error);
        }
      }
      
      console.log('✅ Payment processing completed successfully');
      
      // Refresh payment records to ensure UI is up to date
      await fetchPaymentRecords();
      
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      
      // More specific error handling
      let errorMessage = "Failed to process payment";
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = "Permission denied. Please check your access rights.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('not-found')) {
          errorMessage = "Payment record not found. Please refresh and try again.";
        } else {
          errorMessage = `Payment processing failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Payment Processing Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleModifyPayment = async (paymentId: string, targetDepartment: string, reason: string, comments?: string) => {
    try {
      console.log('Handling payment modification:', paymentId, targetDepartment, reason);
      
      // Update payment status to indicate it's being modified
      await updateDoc(doc(db, 'payment_records', paymentId), {
        status: 'Under Modification',
        modification_reason: reason,
        modification_comments: comments,
        modification_target: targetDepartment,
        updated_at: new Date().toISOString()
      });

      // Update local state
      setPayments(prevPayments => 
        prevPayments.map(p => 
          p.id === paymentId 
            ? { 
                ...p, 
                status: 'Under Modification',
                modification_reason: reason,
                modification_comments: comments
              }
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

  // Add supplier advance function
  const addSupplierAdvance = async (advance: {
    supplierId: string;
    supplierName: string;
    amount: number;
    purpose: string;
    expectedDeliveryDate: string;
  }) => {
    try {
      console.log('Adding supplier advance:', advance);
      
      // Save advance to supplier_advances collection
      const docRef = await addDoc(collection(db, 'supplier_advances'), {
        ...advance,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Save as finance transaction for daily reports
      await addDoc(collection(db, 'finance_transactions'), {
        type: 'Advance',
        description: `Advance given to ${advance.supplierName} - ${advance.purpose}`,
        amount: advance.amount,
        supplier_id: advance.supplierId,
        supplier_name: advance.supplierName,
        advance_id: docRef.id,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Record as daily task for reports
      await addDoc(collection(db, 'daily_tasks'), {
        task_type: 'Advance',
        description: `Advance given to ${advance.supplierName} - UGX ${advance.amount.toLocaleString()}`,
        amount: advance.amount,
        supplier_name: advance.supplierName,
        completed_by: 'Finance Department',
        completed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });

      console.log('Supplier advance saved successfully');
      await fetchFinanceData();
      return true;
    } catch (error) {
      console.error('Error adding supplier advance:', error);
      return false;
    }
  };

  return {
    transactions,
    expenses,
    payments,
    stats,
    loading,
    supplierAdvances,
    addTransaction,
    addExpense,
    processPayment,
    handleModifyPayment,
    addSupplierAdvance,
    refetch: fetchFinanceData
  };
};
