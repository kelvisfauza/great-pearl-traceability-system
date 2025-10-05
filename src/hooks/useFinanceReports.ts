import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FinanceReportData {
  date: string;
  totalCashIn: number;
  totalCashOut: number;
  totalPaid: number;
  totalPartialPaid: number;
  totalBalance: number;
  paidCoffeeKgs: number;
  transactions: {
    id: string;
    type: 'coffee' | 'expense' | 'salary' | 'cash_deposit';
    supplier: string;
    amount: number;
    amountPaid: number;
    balance: number;
    status: string;
    date: string;
    batchNumber?: string;
  }[];
}

export const useFinanceReports = (selectedDate: Date = new Date()) => {
  const [reportData, setReportData] = useState<FinanceReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Initialize report data
      const report: FinanceReportData = {
        date: dateStr,
        totalCashIn: 0,
        totalCashOut: 0,
        totalPaid: 0,
        totalPartialPaid: 0,
        totalBalance: 0,
        paidCoffeeKgs: 0,
        transactions: []
      };

      // Fetch confirmed cash transactions for the date
      const { data: cashTransactions } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('status', 'confirmed')
        .gte('created_at', dateStr)
        .lt('created_at', new Date(new Date(dateStr).getTime() + 86400000).toISOString());

      if (cashTransactions) {
        cashTransactions.forEach(transaction => {
          if (transaction.transaction_type === 'DEPOSIT') {
            report.totalCashIn += Number(transaction.amount);
            
            // Add cash deposit to transactions list
            report.transactions.push({
              id: transaction.id,
              type: 'cash_deposit',
              supplier: transaction.created_by || 'Admin',
              amount: Number(transaction.amount),
              amountPaid: Number(transaction.amount),
              balance: 0,
              status: 'Confirmed',
              date: new Date(transaction.created_at).toLocaleDateString(),
              batchNumber: transaction.reference || 'CASH-DEPOSIT'
            });
          } else if (transaction.transaction_type === 'PAYMENT') {
            report.totalCashOut += Math.abs(Number(transaction.amount));
          }
        });
      }

      // Fetch payment records from Supabase
      const { data: paymentRecords, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('date', dateStr);

      if (paymentError) {
        console.error('Error fetching payment records:', paymentError);
      } else if (paymentRecords) {
        paymentRecords.forEach(payment => {
          const amountPaid = Number(payment.amount) || 0;
          const balance = 0; // Payment records are completed
          
          report.totalPaid += amountPaid;
          report.totalCashOut += amountPaid;

          report.transactions.push({
            id: payment.id,
            type: 'coffee',
            supplier: payment.supplier,
            amount: amountPaid,
            amountPaid: amountPaid,
            balance: balance,
            status: payment.status,
            date: payment.date,
            batchNumber: payment.batch_number || ''
          });
        });
      }

      // Fetch quality assessments with payments from Firebase
      const qualityRef = collection(db, 'qualityAssessments');
      const qualityQuery = query(
        qualityRef,
        where('status', '==', 'approved')
      );
      const qualitySnapshot = await getDocs(qualityQuery);

      for (const doc of qualitySnapshot.docs) {
        const assessment = doc.data();
        const assessmentDate = new Date(assessment.createdAt?.seconds * 1000 || assessment.createdAt);
        
        if (assessmentDate.toISOString().split('T')[0] === dateStr) {
          const totalAmount = Number(assessment.totalAmount) || 0;
          const amountPaid = Number(assessment.amountPaid) || 0;
          const balance = totalAmount - amountPaid;
          const kgs = Number(assessment.kilograms) || 0;

          if (amountPaid > 0) {
            report.totalCashOut += amountPaid;
            report.paidCoffeeKgs += kgs;

            if (balance === 0) {
              report.totalPaid += totalAmount;
            } else if (amountPaid > 0 && balance > 0) {
              report.totalPartialPaid += amountPaid;
              report.totalBalance += balance;
            }

            report.transactions.push({
              id: doc.id,
              type: 'coffee',
              supplier: assessment.supplierName || 'Unknown',
              amount: totalAmount,
              amountPaid: amountPaid,
              balance: balance,
              status: balance === 0 ? 'Paid' : 'Partial',
              date: dateStr,
              batchNumber: assessment.batchNumber || ''
            });
          }
        }
      }

      // Fetch daily tasks for additional financial activities
      const { data: dailyTasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('date', dateStr)
        .eq('department', 'Finance');

      if (dailyTasks) {
        dailyTasks.forEach(task => {
          if (task.amount && task.amount > 0) {
            report.totalCashOut += Number(task.amount);
          }
        });
      }

      // Sort transactions by amount (descending)
      report.transactions.sort((a, b) => b.amount - a.amount);

      setReportData(report);
    } catch (error) {
      console.error('Error fetching finance reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return { reportData, loading, refetch: fetchReportData };
};
