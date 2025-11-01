import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalaryPeriod {
  canRequest: boolean;
  periodType: 'mid-month' | 'end-month' | 'closed';
  maxAmount: number;
  alreadyRequested: number;
  availableAmount: number;
  message: string;
}

export const useMonthlySalaryTracking = (employeeEmail: string | undefined, monthlySalary: number) => {
  const [periodInfo, setPeriodInfo] = useState<SalaryPeriod>({
    canRequest: false,
    periodType: 'closed',
    maxAmount: 0,
    alreadyRequested: 0,
    availableAmount: 0,
    message: 'Loading...'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeEmail) {
      setLoading(false);
      return;
    }
    
    checkSalaryPeriod();
  }, [employeeEmail, monthlySalary]);

  const checkSalaryPeriod = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Determine which period we're in
      let periodType: 'mid-month' | 'end-month' | 'closed' = 'closed';
      let maxAmount = 0;
      
      // Mid-month period: 13th-15th (50% of salary)
      if (dayOfMonth >= 13 && dayOfMonth <= 15) {
        periodType = 'mid-month';
        maxAmount = monthlySalary / 2;
      } 
      // End-month period: 31st to 2nd (remaining balance to complete 100%)
      else if (dayOfMonth === 31 || dayOfMonth === 1 || dayOfMonth === 2) {
        periodType = 'end-month';
        maxAmount = monthlySalary; // Will be reduced by what was already paid
      }

      // Get requests for current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: monthlyRequests, error } = await supabase
        .from('money_requests')
        .select('amount, status, request_type')
        .eq('requested_by', employeeEmail)
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['pending', 'approved']); // Count both pending and approved

      if (error) throw error;

      // Calculate total already requested this month
      const alreadyRequested = monthlyRequests?.reduce((sum, req) => sum + Number(req.amount), 0) || 0;
      
      // Calculate available amount
      let availableAmount = 0;
      let message = '';
      let canRequest = false;

      if (periodType === 'closed') {
        message = 'Salary requests are only available during:\n• Mid-month: 13th-15th (50% of salary)\n• End-month: 31st-2nd (remaining balance)';
      } else if (periodType === 'mid-month') {
        availableAmount = Math.max(0, maxAmount - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = `You can request up to UGX ${availableAmount.toLocaleString()} (50% of your monthly salary).`;
        } else {
          message = `You have already requested your mid-month allocation of UGX ${maxAmount.toLocaleString()}.`;
        }
      } else if (periodType === 'end-month') {
        // For end-month, max is monthly salary minus what was already paid
        availableAmount = Math.max(0, monthlySalary - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = `You can request up to UGX ${availableAmount.toLocaleString()} to complete your monthly salary.`;
        } else {
          message = `You have already received your full monthly salary of UGX ${monthlySalary.toLocaleString()}.`;
        }
      }

      setPeriodInfo({
        canRequest,
        periodType,
        maxAmount,
        alreadyRequested,
        availableAmount,
        message
      });
    } catch (error) {
      console.error('Error checking salary period:', error);
      setPeriodInfo({
        canRequest: false,
        periodType: 'closed',
        maxAmount: 0,
        alreadyRequested: 0,
        availableAmount: 0,
        message: 'Error checking salary availability. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    periodInfo,
    loading,
    refetch: checkSalaryPeriod
  };
};
