import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyReconciliation {
  // Period
  month: string;
  year: number;
  
  // Purchases
  totalPurchases: number;
  totalPurchaseKg: number;
  
  // Sales
  totalSales: number;
  totalSalesKg: number;
  
  // Inventory
  openingInventoryValue: number;
  closingInventoryValue: number;
  closingInventoryKg: number;
  
  // Payments & Advances
  totalPaymentsToSuppliers: number;
  totalAdvancesGiven: number;
  totalExpenses: number;
  
  // Cash Flow
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  
  // P&L
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  
  // Balance Sheet
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
}

export const useMonthlyReconciliation = (selectedMonth: number, selectedYear: number) => {
  const [data, setData] = useState<MonthlyReconciliation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReconciliationData = async () => {
    setLoading(true);
    try {
      // Date ranges
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch purchases from Firebase (coffee_records)
      const purchasesSnapshot = await getDocs(collection(db, 'coffee_records'));
      let totalPurchases = 0;
      let totalPurchaseKg = 0;
      let openingInventoryValue = 0;
      let closingInventoryValue = 0;
      let closingInventoryKg = 0;

      purchasesSnapshot.forEach(doc => {
        const record = doc.data();
        const recordDate = new Date(record.date);
        const kg = Number(record.kilograms) || 0;
        const price = Number(record.price_per_kg) || 0;
        const value = kg * price;

        // Purchases in selected month
        if (recordDate >= startDate && recordDate <= endDate) {
          totalPurchases += value;
          totalPurchaseKg += kg;
        }

        // Opening inventory (before start date, not sold)
        if (recordDate < startDate && record.status !== 'sold') {
          openingInventoryValue += value;
        }

        // Closing inventory (up to end date, not sold)
        if (recordDate <= endDate && record.status !== 'sold') {
          closingInventoryValue += value;
          closingInventoryKg += kg;
        }
      });

      // Fetch sales from Supabase
      const { data: salesData } = await supabase
        .from('sales_transactions')
        .select('total_amount, weight')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalSalesKg = salesData?.reduce((sum, sale) => sum + Number(sale.weight), 0) || 0;

      // Fetch payments to suppliers
      const { data: paymentsData } = await supabase
        .from('payment_records')
        .select('amount')
        .eq('status', 'Paid')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      const totalPaymentsToSuppliers = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch advances from Firebase
      const advancesSnapshot = await getDocs(collection(db, 'supplier_advances'));
      let totalAdvancesGiven = 0;
      advancesSnapshot.forEach(doc => {
        const advance = doc.data();
        const advanceDate = advance.issued_at?.toDate?.() || new Date(advance.issued_at);
        if (advanceDate >= startDate && advanceDate <= endDate) {
          totalAdvancesGiven += Number(advance.amount_ugx) || 0;
        }
      });

      // Fetch expenses from Supabase
      const { data: expensesData } = await supabase
        .from('approval_requests')
        .select('amount')
        .eq('type', 'Expense Request')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Fetch cash transactions
      const { data: cashTransactions } = await supabase
        .from('finance_cash_transactions')
        .select('amount, transaction_type')
        .eq('status', 'confirmed')
        .gte('confirmed_at', startDate.toISOString())
        .lte('confirmed_at', endDate.toISOString());

      let totalCashIn = 0;
      let totalCashOut = 0;

      cashTransactions?.forEach(tx => {
        const amount = Math.abs(Number(tx.amount));
        if (tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'ADVANCE_RECOVERY') {
          totalCashIn += amount;
        } else if (tx.transaction_type === 'PAYMENT' || tx.transaction_type === 'EXPENSE') {
          totalCashOut += amount;
        }
      });

      const netCashFlow = totalCashIn - totalCashOut;

      // Calculate P&L
      const revenue = totalSales;
      const costOfGoodsSold = openingInventoryValue + totalPurchases - closingInventoryValue;
      const grossProfit = revenue - costOfGoodsSold;
      const operatingExpenses = totalExpenses;
      const netProfit = grossProfit - operatingExpenses;

      // Calculate Balance Sheet
      const totalAssets = closingInventoryValue + netCashFlow;
      const totalLiabilities = totalAdvancesGiven; // Outstanding advances
      const equity = totalAssets - totalLiabilities;

      setData({
        month: startDate.toLocaleString('default', { month: 'long' }),
        year: selectedYear,
        totalPurchases,
        totalPurchaseKg,
        totalSales,
        totalSalesKg,
        openingInventoryValue,
        closingInventoryValue,
        closingInventoryKg,
        totalPaymentsToSuppliers,
        totalAdvancesGiven,
        totalExpenses,
        totalCashIn,
        totalCashOut,
        netCashFlow,
        revenue,
        costOfGoodsSold,
        grossProfit,
        operatingExpenses,
        netProfit,
        totalAssets,
        totalLiabilities,
        equity
      });
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, [selectedMonth, selectedYear]);

  return { data, loading, refetch: fetchReconciliationData };
};
