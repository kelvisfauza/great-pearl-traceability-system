import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface FinanceStats {
  pendingCoffeePayments: number;
  pendingCoffeeAmount: number;
  availableCash: number;
  pendingExpenseRequests: number;
  pendingExpenseAmount: number;
  completedToday: number;
  completedTodayAmount: number;
}

export const useFinanceStats = () => {
  const [stats, setStats] = useState<FinanceStats>({
    pendingCoffeePayments: 0,
    pendingCoffeeAmount: 0,
    availableCash: 2400000, // Mock data
    pendingExpenseRequests: 0,
    pendingExpenseAmount: 0,
    completedToday: 0,
    completedTodayAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch pending coffee payments from quality assessments
      const qualityQuery = query(
        collection(db, 'quality_assessments'),
        where('status', 'in', ['assessed', 'submitted_to_finance'])
      );
      const qualitySnapshot = await getDocs(qualityQuery);
      const pendingCoffeePayments = qualitySnapshot.size;
      
      // Calculate pending coffee amount
      let pendingCoffeeAmount = 0;
      qualitySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const kilograms = data.kilograms || 0;
        const pricePerKg = data.suggested_price || 0;
        pendingCoffeeAmount += kilograms * pricePerKg;
      });

      // Fetch pending expense requests from Supabase
      const { data: expenseRequests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .eq('status', 'Pending');

      const pendingExpenseRequests = expenseRequests?.length || 0;
      const pendingExpenseAmount = expenseRequests?.reduce((sum, req) => 
        sum + parseFloat(req.amount || '0'), 0) || 0;

      // Mock completed today data
      const completedToday = 8;
      const completedTodayAmount = 1250000;

      setStats({
        pendingCoffeePayments,
        pendingCoffeeAmount,
        availableCash: 2400000,
        pendingExpenseRequests,
        pendingExpenseAmount,
        completedToday,
        completedTodayAmount
      });
    } catch (error) {
      console.error('Error fetching finance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};