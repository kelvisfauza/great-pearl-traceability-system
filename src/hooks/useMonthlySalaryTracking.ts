import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalaryPeriod {
  canRequest: boolean;
  periodType: 'mid-month' | 'end-month' | 'emergency' | 'closed';
  maxAmount: number;
  alreadyRequested: number;
  availableAmount: number;
  message: string;
  isEmergency?: boolean;
}

export const useMonthlySalaryTracking = (
  employeeEmail: string | undefined, 
  monthlySalary: number,
  requestType: 'mid-month' | 'end-month' | 'emergency' = 'mid-month'
) => {
  const [periodInfo, setPeriodInfo] = useState<SalaryPeriod>({
    canRequest: false,
    periodType: 'closed',
    maxAmount: 0,
    alreadyRequested: 0,
    availableAmount: 0,
    message: 'Loading...',
    isEmergency: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeEmail) {
      setLoading(false);
      return;
    }
    
    checkSalaryPeriod();
  }, [employeeEmail, monthlySalary, requestType]);

  const checkSalaryPeriod = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const dayOfMonth = today.getDate();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      
      // Calculate start of current month
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      
      // Get all requests for this month (pending + approved)
      const { data: monthlyRequests, error: requestsError } = await supabase
        .from('approval_requests')
        .select('amount, status, created_at')
        .eq('requestedby', employeeEmail)
        .eq('type', 'Employee Salary Request')
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['Pending', 'Approved']);

      if (requestsError) throw requestsError;

      const totalRequestedThisMonth = monthlyRequests?.reduce((sum, req) => sum + Number(req.amount), 0) || 0;
      
      // Emergency requests can be made anytime
      if (requestType === 'emergency') {
        const availableAmount = Math.max(0, monthlySalary - totalRequestedThisMonth);

        setPeriodInfo({
          canRequest: availableAmount > 0,
          periodType: 'emergency',
          maxAmount: monthlySalary,
          alreadyRequested: totalRequestedThisMonth,
          availableAmount,
          message: availableAmount > 0 
            ? `Emergency request available. Remaining balance: UGX ${availableAmount.toLocaleString()} of UGX ${monthlySalary.toLocaleString()}`
            : `You have already requested your full monthly salary of UGX ${monthlySalary.toLocaleString()}`,
          isEmergency: true
        });
        setLoading(false);
        return;
      }
      
      // Determine which period we're in for regular requests
      let periodType: 'mid-month' | 'end-month' | 'closed' = 'closed';
      let maxAmount = 0;
      
      // Mid-month period: 13th-15th (50% of salary)
      if (requestType === 'mid-month' && dayOfMonth >= 13 && dayOfMonth <= 15) {
        periodType = 'mid-month';
        maxAmount = monthlySalary / 2;
      } 
      // End-month period: 31st to 2nd (remaining balance to complete 100%)
      else if (requestType === 'end-month' && (dayOfMonth === 31 || dayOfMonth === 1 || dayOfMonth === 2)) {
        periodType = 'end-month';
        maxAmount = monthlySalary;
      }

      // Total already requested is calculated above
      const alreadyRequested = totalRequestedThisMonth;
      
      // Calculate available amount
      let availableAmount = 0;
      let message = '';
      let canRequest = false;

      if (periodType === 'closed') {
        if (requestType === 'mid-month') {
          message = 'Mid-month requests are only available from 13th-15th of each month.';
        } else if (requestType === 'end-month') {
          message = 'End-month requests are only available from 31st-2nd of each month.';
        } else {
          message = 'This request type is not available in the current period.';
        }
      } else if (periodType === 'mid-month') {
        availableAmount = Math.max(0, maxAmount - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = `Available: UGX ${availableAmount.toLocaleString()} of UGX ${maxAmount.toLocaleString()} (50% mid-month allocation). Already requested this month: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your mid-month allocation of UGX ${maxAmount.toLocaleString()}. Total requested: UGX ${alreadyRequested.toLocaleString()}`;
        }
      } else if (periodType === 'end-month') {
        // For end-month, max is monthly salary minus what was already paid
        availableAmount = Math.max(0, monthlySalary - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = `Available: UGX ${availableAmount.toLocaleString()} of UGX ${monthlySalary.toLocaleString()} (remaining balance). Already requested this month: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your full monthly salary of UGX ${monthlySalary.toLocaleString()}. Total requested: UGX ${alreadyRequested.toLocaleString()}`;
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
