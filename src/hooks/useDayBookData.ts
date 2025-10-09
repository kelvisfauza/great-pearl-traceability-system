import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DayBookData {
  date: string;
  openingBalance: number;
  closingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  cashInTransactions: {
    type: string;
    description: string;
    amount: number;
    reference: string;
  }[];
  cashOutTransactions: {
    type: string;
    description: string;
    amount: number;
    reference: string;
  }[];
  suppliersPaid: {
    supplier: string;
    amount: number;
    batchNumber: string;
    advanceRecovered?: number;
  }[];
  advancesGiven: {
    supplier: string;
    amount: number;
    reference: string;
  }[];
  overtimeAdvances: {
    employee: string;
    amount: number;
    status: string;
  }[];
  totalOvertimeAdvances: number;
}

export const useDayBookData = (selectedDate: Date = new Date()) => {
  const [dayBookData, setDayBookData] = useState<DayBookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDayBookData();
  }, [selectedDate]);

  const fetchDayBookData = async () => {
    setLoading(true);
    try {
      // Use local timezone date to match database records
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      const report: DayBookData = {
        date: dateStr,
        openingBalance: 0,
        closingBalance: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        cashInTransactions: [],
        cashOutTransactions: [],
        suppliersPaid: [],
        advancesGiven: [],
        overtimeAdvances: [],
        totalOvertimeAdvances: 0
      };

      // Calculate opening balance (sum of all confirmed transactions before today)
      const { data: transactionsBeforeToday } = await supabase
        .from('finance_cash_transactions')
        .select('amount')
        .eq('status', 'confirmed')
        .lt('confirmed_at', startOfDay.toISOString());

      if (transactionsBeforeToday && transactionsBeforeToday.length > 0) {
        report.openingBalance = transactionsBeforeToday.reduce((sum, t) => sum + Number(t.amount), 0);
      }

      // Fetch all cash transactions for the day (by confirmed date)
      console.log('🔍 Day Book - Looking for transactions on date:', dateStr);
      
      const { data: cashTransactions } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('status', 'confirmed')
        .gte('confirmed_at', startOfDay.toISOString())
        .lte('confirmed_at', endOfDay.toISOString())
        .order('confirmed_at', { ascending: true });

      console.log('📊 Day Book - Cash Transactions found:', cashTransactions?.length || 0, cashTransactions);

      if (cashTransactions) {
        cashTransactions.forEach(transaction => {
          const amount = Math.abs(Number(transaction.amount));
          
          // Create friendly type labels
          let typeLabel = transaction.transaction_type;
          if (transaction.transaction_type === 'ADVANCE_RECOVERY') {
            typeLabel = 'Advance Recovery';
          } else if (transaction.transaction_type === 'DEPOSIT') {
            typeLabel = 'Cash Deposit';
          } else if (transaction.transaction_type === 'PAYMENT') {
            typeLabel = 'Payment';
          } else if (transaction.transaction_type === 'EXPENSE') {
            typeLabel = 'Expense';
          }
          
          const txData = {
            type: typeLabel,
            description: transaction.notes || transaction.transaction_type,
            amount: amount,
            reference: transaction.reference || ''
          };

          if (transaction.transaction_type === 'DEPOSIT' || transaction.transaction_type === 'ADVANCE_RECOVERY') {
            report.totalCashIn += amount;
            report.cashInTransactions.push(txData);
            console.log('✅ Adding Cash In:', typeLabel, amount, transaction);
          } else if (transaction.transaction_type === 'PAYMENT' || transaction.transaction_type === 'EXPENSE') {
            report.totalCashOut += amount;
            report.cashOutTransactions.push(txData);
            
            // Add to suppliers paid (only for PAYMENT type)
            if (transaction.transaction_type === 'PAYMENT') {
              const supplierMatch = transaction.notes?.match(/Payment to (.+?) -/);
              if (supplierMatch) {
                report.suppliersPaid.push({
                  supplier: supplierMatch[1],
                  amount: amount,
                  batchNumber: transaction.reference || '',
                });
              }
            }
          }
        });
      }

      // Fetch supplier advances given on this day from Firebase
      const advancesQuery = query(
        collection(db, 'supplier_advances'),
        where('issued_at', '>=', startOfDay.toISOString()),
        where('issued_at', '<=', endOfDay.toISOString())
      );

      const advancesSnapshot = await getDocs(advancesQuery);
      advancesSnapshot.forEach(doc => {
        const advance = doc.data();
        const advanceAmount = Number(advance.amount_ugx) || 0;
        
        report.totalCashOut += advanceAmount;
        report.advancesGiven.push({
          supplier: advance.supplier_name || 'Unknown',
          amount: advanceAmount,
          reference: advance.supplier_code || doc.id
        });

        report.cashOutTransactions.push({
          type: 'Advance Given',
          description: `Advance to ${advance.supplier_name || 'Unknown'}`,
          amount: advanceAmount,
          reference: advance.supplier_code || doc.id
        });
      });

      // Fetch payment records from payment_records table for the day
      const { data: paymentRecords } = await supabase
        .from('payment_records')
        .select('*')
        .eq('date', dateStr)
        .eq('status', 'Paid');

      console.log('💰 Day Book - Payment Records found:', paymentRecords?.length || 0, paymentRecords);

      if (paymentRecords) {
        paymentRecords.forEach(payment => {
          const amount = Number(payment.amount) || 0;
          
          report.totalCashOut += amount;
          report.cashOutTransactions.push({
            type: 'Coffee Payment',
            description: `Payment to ${payment.supplier}`,
            amount: amount,
            reference: payment.batch_number || ''
          });

          report.suppliersPaid.push({
            supplier: payment.supplier,
            amount: amount,
            batchNumber: payment.batch_number || '',
          });
        });
      }

      // Fetch overtime/money requests (salary advances) for the day
      const { data: moneyRequests } = await supabase
        .from('money_requests')
        .select('*, employees(name)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .in('status', ['pending', 'finance_approved', 'approved']);

      if (moneyRequests) {
        moneyRequests.forEach(request => {
          const amount = Number(request.amount) || 0;
          report.totalOvertimeAdvances += amount;
          report.overtimeAdvances.push({
            employee: (request.employees as any)?.name || 'Unknown',
            amount: amount,
            status: request.status
          });
        });
      }

      // Calculate closing balance
      report.closingBalance = report.openingBalance + report.totalCashIn - report.totalCashOut;

      setDayBookData(report);
    } catch (error) {
      console.error('Error fetching day book data:', error);
    } finally {
      setLoading(false);
    }
  };

  return { dayBookData, loading, refetch: fetchDayBookData };
};