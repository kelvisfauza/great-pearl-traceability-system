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
  paidLastMonth?: number;
  baseAvailable?: number;
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
    isEmergency: false,
    paidLastMonth: 0,
    baseAvailable: 0
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
      
      // Calculate start of current and previous month
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
      
      // Get ONLY THE MOST RECENT MID-MONTH approved request from LAST MONTH per person
      const { data: lastMonthRequests } = await supabase
        .from('approval_requests')
        .select('amount, title, details, created_at')
        .eq('requestedby', employeeEmail)
        .eq('type', 'Employee Salary Request')
        .eq('status', 'Approved')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())
        .ilike('title', '%Mid-Month%')
        .order('created_at', { ascending: false })
        .limit(1);

      const paidLastMonth = lastMonthRequests?.[0]?.amount || 0;
      
      // Get all requests for THIS month (pending + approved)
      const { data: monthlyRequests, error: requestsError } = await supabase
        .from('approval_requests')
        .select('amount, status, created_at')
        .eq('requestedby', employeeEmail)
        .eq('type', 'Employee Salary Request')
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['Pending', 'Approved']);

      if (requestsError) throw requestsError;

      const totalRequestedThisMonth = monthlyRequests?.reduce((sum, req) => sum + Number(req.amount), 0) || 0;
      
      // Calculate base available (monthly salary minus what was paid last month)
      const baseAvailable = Math.max(0, monthlySalary - paidLastMonth);
      
      // Emergency requests can be made anytime (but limited to base available amount)
      if (requestType === 'emergency') {
        const availableAmount = Math.max(0, baseAvailable - totalRequestedThisMonth);

        setPeriodInfo({
          canRequest: availableAmount > 0,
          periodType: 'emergency',
          maxAmount: baseAvailable,
          alreadyRequested: totalRequestedThisMonth,
          availableAmount,
          message: paidLastMonth > 0
            ? `Emergency request available. You received UGX ${paidLastMonth.toLocaleString()} last month. Remaining: UGX ${availableAmount.toLocaleString()} of UGX ${baseAvailable.toLocaleString()}`
            : availableAmount > 0
              ? `Emergency request available. Remaining balance: UGX ${availableAmount.toLocaleString()} of UGX ${monthlySalary.toLocaleString()}`
              : `You have already requested your full available balance of UGX ${baseAvailable.toLocaleString()}`,
          isEmergency: true,
          paidLastMonth,
          baseAvailable
        });
        setLoading(false);
        return;
      }
      
      // Determine which period we're in for regular requests
      let periodType: 'mid-month' | 'end-month' | 'closed' = 'closed';
      let maxAmount = 0;
      
      // Mid-month period: 13th-15th (50% of base available after last month's deduction)
      if (requestType === 'mid-month' && dayOfMonth >= 13 && dayOfMonth <= 15) {
        periodType = 'mid-month';
        maxAmount = baseAvailable / 2;
      } 
      // End-month period: 31st to 2nd (full remaining balance after last month)
      else if (requestType === 'end-month' && (dayOfMonth === 31 || dayOfMonth === 1 || dayOfMonth === 2)) {
        periodType = 'end-month';
        maxAmount = baseAvailable;
      }

      // Total already requested is calculated above
      const alreadyRequested = totalRequestedThisMonth;
      
      // Calculate available amount
      let availableAmount = 0;
      let message = '';
      let canRequest = false;

      if (periodType === 'closed') {
        if (requestType === 'mid-month') {
          message = paidLastMonth > 0
            ? `Mid-month requests (13th-15th only). Last month you received UGX ${paidLastMonth.toLocaleString()}. Base available: UGX ${baseAvailable.toLocaleString()}`
            : 'Mid-month requests are only available from 13th-15th of each month.';
        } else if (requestType === 'end-month') {
          message = paidLastMonth > 0
            ? `End-month requests (31st-2nd only). Last month you received UGX ${paidLastMonth.toLocaleString()}. Base available: UGX ${baseAvailable.toLocaleString()}`
            : 'End-month requests are only available from 31st-2nd of each month.';
        } else {
          message = 'This request type is not available in the current period.';
        }
      } else if (periodType === 'mid-month') {
        availableAmount = Math.max(0, maxAmount - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = paidLastMonth > 0
            ? `Available: UGX ${availableAmount.toLocaleString()} of UGX ${maxAmount.toLocaleString()} (50% of remaining). Last month paid: UGX ${paidLastMonth.toLocaleString()}. This month requested: UGX ${alreadyRequested.toLocaleString()}`
            : `Available: UGX ${availableAmount.toLocaleString()} of UGX ${maxAmount.toLocaleString()} (50% mid-month allocation). Already requested this month: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your mid-month allocation of UGX ${maxAmount.toLocaleString()}. Total requested: UGX ${alreadyRequested.toLocaleString()}`;
        }
      } else if (periodType === 'end-month') {
        // For end-month, available is base minus what was already requested this month
        availableAmount = Math.max(0, baseAvailable - alreadyRequested);
        canRequest = availableAmount > 0;
        
        if (canRequest) {
          message = paidLastMonth > 0
            ? `Available: UGX ${availableAmount.toLocaleString()} of UGX ${baseAvailable.toLocaleString()} (after last month's UGX ${paidLastMonth.toLocaleString()}). This month requested: UGX ${alreadyRequested.toLocaleString()}`
            : `Available: UGX ${availableAmount.toLocaleString()} of UGX ${monthlySalary.toLocaleString()} (remaining balance). Already requested this month: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your full available balance of UGX ${baseAvailable.toLocaleString()}. Total requested: UGX ${alreadyRequested.toLocaleString()}`;
        }
      }

      setPeriodInfo({
        canRequest,
        periodType,
        maxAmount,
        alreadyRequested,
        availableAmount,
        message,
        paidLastMonth,
        baseAvailable
      });
    } catch (error) {
      console.error('Error checking salary period:', error);
      setPeriodInfo({
        canRequest: false,
        periodType: 'closed',
        maxAmount: 0,
        alreadyRequested: 0,
        availableAmount: 0,
        message: 'Error checking salary availability. Please try again.',
        paidLastMonth: 0,
        baseAvailable: 0
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
