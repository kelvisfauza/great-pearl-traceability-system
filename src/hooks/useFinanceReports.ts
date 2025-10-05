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

      // Fetch confirmed cash deposits for the date (using confirmed_at)
      const { data: cashDeposits } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('transaction_type', 'DEPOSIT')
        .eq('status', 'confirmed')
        .gte('confirmed_at', dateStr)
        .lt('confirmed_at', new Date(new Date(dateStr).getTime() + 86400000).toISOString());

      console.log('Cash deposits for date', dateStr, ':', cashDeposits);

      if (cashDeposits) {
        cashDeposits.forEach(deposit => {
          const depositAmount = Number(deposit.amount);
          report.totalCashIn += depositAmount;
          
          // Add cash deposit to transactions list
          report.transactions.push({
            id: deposit.id,
            type: 'cash_deposit',
            supplier: `Cash Deposit by ${deposit.created_by || 'Admin'}`,
            amount: depositAmount,
            amountPaid: depositAmount,
            balance: 0,
            status: 'Confirmed',
            date: new Date(deposit.confirmed_at).toLocaleDateString(),
            batchNumber: deposit.reference || 'CASH-DEPOSIT'
          });
        });
      }

      // Fetch cash payment transactions for the date (using confirmed_at)
      const { data: cashPayments } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('transaction_type', 'PAYMENT')
        .eq('status', 'confirmed')
        .gte('confirmed_at', dateStr)
        .lt('confirmed_at', new Date(new Date(dateStr).getTime() + 86400000).toISOString());

      if (cashPayments) {
        cashPayments.forEach(payment => {
          const paymentAmount = Math.abs(Number(payment.amount));
          report.totalCashOut += paymentAmount;
          
          // Add cash payment to transactions list
          report.transactions.push({
            id: payment.id,
            type: 'coffee',
            supplier: payment.notes || 'Cash Payment',
            amount: paymentAmount,
            amountPaid: paymentAmount,
            balance: 0,
            status: 'Paid',
            date: new Date(payment.confirmed_at).toLocaleDateString(),
            batchNumber: payment.reference || 'CASH-PMT'
          });
        });
      }

      // Fetch payment records from Supabase (filter by created_at timestamp, not date field)
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: paymentRecords, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .eq('status', 'Paid');

      if (paymentError) {
        console.error('Error fetching payment records:', paymentError);
      } else if (paymentRecords) {
        console.log('📊 Payment records found for date:', paymentRecords.length);
        
        paymentRecords.forEach(payment => {
          const amountPaid = Number(payment.amount) || 0;
          
          report.totalPaid += amountPaid;
          report.totalCashOut += amountPaid;

          report.transactions.push({
            id: payment.id,
            type: 'coffee',
            supplier: payment.supplier,
            amount: amountPaid,
            amountPaid: amountPaid,
            balance: 0,
            status: payment.status,
            date: new Date(payment.created_at).toLocaleDateString(),
            batchNumber: payment.batch_number || ''
          });
        });
      }

      // Remove duplicate quality assessments check - now using Supabase payment_records only

      // Fetch daily tasks for additional financial activities
      const { data: dailyTasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('date', dateStr)
        .eq('department', 'Finance');

      if (dailyTasks) {
        dailyTasks.forEach(task => {
          if (task.amount && task.amount > 0) {
            const taskAmount = Number(task.amount);
            report.totalCashOut += taskAmount;
            
            // Add task to transactions for visibility
            report.transactions.push({
              id: task.id,
              type: 'expense',
              supplier: task.description || 'Finance Task',
              amount: taskAmount,
              amountPaid: taskAmount,
              balance: 0,
              status: 'Completed',
              date: task.date,
              batchNumber: task.batch_number || 'TASK'
            });
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
