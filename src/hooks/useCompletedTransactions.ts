import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface CompletedTransaction {
  id: string;
  type: 'coffee' | 'expense' | 'hr';
  batchNumber: string;
  supplier: string;
  method: string;
  amountPaid: number;
  balance: number;
  dateCompleted: string;
  processedBy: string;
  description?: string;
  notes?: string;
}

export const useCompletedTransactions = () => {
  const [transactions, setTransactions] = useState<CompletedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedTransactions();
  }, []);

  const fetchCompletedTransactions = async () => {
    try {
      setLoading(true);
      
      const allTransactions: CompletedTransaction[] = [];

      // Fetch completed coffee payments
      const coffeePaymentsQuery = query(
        collection(db, 'payment_records'),
        where('status', 'in', ['Paid', 'Completed']),
        orderBy('updated_at', 'desc')
      );
      const coffeeSnapshot = await getDocs(coffeePaymentsQuery);
      
      coffeeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const totalAmount = data.amount || 0;
        const paidAmount = data.paid_amount || totalAmount;
        const balance = totalAmount - paidAmount;
        
        allTransactions.push({
          id: doc.id,
          type: 'coffee',
          batchNumber: data.batchNumber || 'N/A',
          supplier: data.supplier || 'Unknown',
          method: data.method || 'Cash',
          amountPaid: paidAmount,
          balance: Math.max(0, balance),
          dateCompleted: new Date(data.updated_at || data.created_at).toLocaleDateString(),
          processedBy: data.processed_by || 'Finance Department',
          notes: data.notes
        });
      });

      // Fetch completed expense payments
      const { data: expenseRequests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .eq('status', 'Approved')
        .order('updated_at', { ascending: false });

      expenseRequests?.forEach(req => {
        allTransactions.push({
          id: req.id,
          type: 'expense',
          batchNumber: req.id.slice(-8),
          supplier: req.requestedby,
          method: 'Bank Transfer',
          amountPaid: parseFloat(req.amount || '0'),
          balance: 0,
          dateCompleted: new Date(req.updated_at).toLocaleDateString(),
          processedBy: req.admin_approved_by || req.finance_approved_by || 'Admin',
          description: req.title,
          notes: req.description
        });
      });

      // Mock HR payments data
      const mockHRPayments = [
        {
          id: 'hr_001',
          type: 'hr' as const,
          batchNumber: 'SAL_001',
          supplier: 'John Doe',
          method: 'Bank Transfer',
          amountPaid: 800000,
          balance: 0,
          dateCompleted: new Date().toLocaleDateString(),
          processedBy: 'Finance Department',
          description: 'Monthly Salary',
          notes: 'Regular monthly salary payment'
        }
      ];

      allTransactions.push(...mockHRPayments);
      
      // Sort all transactions by date
      allTransactions.sort((a, b) => 
        new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime()
      );
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching completed transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions,
    loading,
    refetch: fetchCompletedTransactions
  };
};