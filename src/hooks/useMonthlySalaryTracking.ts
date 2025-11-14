import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalaryPeriod {
  canRequest: boolean;
  periodType: 'mid-month' | 'end-month' | 'emergency' | 'advance' | 'closed';
  maxAmount: number;
  alreadyRequested: number;
  availableAmount: number;
  message: string;
  isEmergency?: boolean;
  isAdvance?: boolean;
  paidLastMonth?: number;
  baseAvailable?: number;
  advancesOwed?: number;
  overtimeEarned?: number;
}

export const useMonthlySalaryTracking = (
  employeeEmail: string | undefined, 
  monthlySalary: number,
  requestType: 'mid-month' | 'end-month' | 'emergency' | 'advance' = 'mid-month'
) => {
  const [periodInfo, setPeriodInfo] = useState<SalaryPeriod>({
    canRequest: false,
    periodType: 'closed',
    maxAmount: 0,
    alreadyRequested: 0,
    availableAmount: 0,
    message: 'Loading...',
    isEmergency: false,
    isAdvance: false,
    paidLastMonth: 0,
    baseAvailable: 0,
    advancesOwed: 0,
    overtimeEarned: 0
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
      
      // Get all salary advances (these create negative balances)
      const { data: advanceRequests } = await supabase
        .from('approval_requests')
        .select('amount, status, created_at')
        .eq('requestedby', employeeEmail)
        .eq('type', 'Salary Advance')
        .eq('status', 'Approved')
        .gte('created_at', startOfMonth.toISOString());

      const advancesOwed = advanceRequests?.reduce((sum, req) => sum + Number(req.amount), 0) || 0;
      
      // Get overtime awards for THIS month that haven't been claimed
      const { data: overtimeAwards } = await supabase
        .from('overtime_awards')
        .select('total_amount, status')
        .eq('employee_email', employeeEmail)
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['pending', 'claimed']);

      const overtimeEarned = overtimeAwards?.reduce((sum, award) => sum + Number(award.total_amount), 0) || 0;
      
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
      
      // Calculate base available (monthly salary minus what was paid last month AND minus advances owed PLUS overtime earned)
      const baseAvailable = monthlySalary - paidLastMonth - advancesOwed + overtimeEarned;
      
      // Salary Advance - can be requested anytime and creates negative balance
      if (requestType === 'advance') {
        const overtimeInfo = overtimeEarned > 0 ? ` Overtime earned: +UGX ${overtimeEarned.toLocaleString()}.` : '';
        setPeriodInfo({
          canRequest: true,
          periodType: 'advance',
          maxAmount: monthlySalary,
          alreadyRequested: advancesOwed,
          availableAmount: baseAvailable,
          message: advancesOwed > 0
            ? `⚠️ You owe UGX ${advancesOwed.toLocaleString()} in advances.${overtimeInfo} Current balance: UGX ${baseAvailable.toLocaleString()}`
            : `Salary Advance available.${overtimeInfo} Monthly salary: UGX ${monthlySalary.toLocaleString()}. This will be deducted from your next salary.`,
          isAdvance: true,
          paidLastMonth,
          baseAvailable,
          advancesOwed,
          overtimeEarned
        });
        setLoading(false);
        return;
      }
      
      // Emergency requests can be made anytime (but limited to base available amount)
      if (requestType === 'emergency') {
        const availableAmount = baseAvailable - totalRequestedThisMonth;
        const overtimeInfo = overtimeEarned > 0 ? ` Overtime: +UGX ${overtimeEarned.toLocaleString()}.` : '';

        setPeriodInfo({
          canRequest: availableAmount > 0,
          periodType: 'emergency',
          maxAmount: baseAvailable,
          alreadyRequested: totalRequestedThisMonth,
          availableAmount,
          message: advancesOwed > 0
            ? `Emergency request available. Advances owed: UGX ${advancesOwed.toLocaleString()}.${overtimeInfo} Remaining: UGX ${availableAmount.toLocaleString()}`
            : paidLastMonth > 0
              ? `Emergency request available. Last month: UGX ${paidLastMonth.toLocaleString()}.${overtimeInfo} Remaining: UGX ${availableAmount.toLocaleString()}`
              : availableAmount > 0
                ? `Emergency request available.${overtimeInfo} Remaining: UGX ${availableAmount.toLocaleString()}`
                : `You have already requested your full available balance`,
          isEmergency: true,
          paidLastMonth,
          baseAvailable,
          advancesOwed,
          overtimeEarned
        });
        setLoading(false);
        return;
      }
      
      // Determine which period we're in for regular requests
      let periodType: 'mid-month' | 'end-month' | 'closed' = 'closed';
      let maxAmount = 0;
      
      // Mid-month period: 14th-15th (FULL balance available)
      if (requestType === 'mid-month' && dayOfMonth >= 14 && dayOfMonth <= 15) {
        periodType = 'mid-month';
        maxAmount = baseAvailable;
      } 
      // End-month period: 28th-31st (FULL balance available)
      else if (requestType === 'end-month' && dayOfMonth >= 28 && dayOfMonth <= 31) {
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
        const debtWarning = advancesOwed > 0 ? ` ⚠️ Advances owed: UGX ${advancesOwed.toLocaleString()}.` : '';
        const overtimeInfo = overtimeEarned > 0 ? ` Overtime: +UGX ${overtimeEarned.toLocaleString()}.` : '';
        if (requestType === 'mid-month') {
          message = paidLastMonth > 0
            ? `Mid-month requests (14th-15th only). Last month: UGX ${paidLastMonth.toLocaleString()}.${debtWarning}${overtimeInfo} Full balance: UGX ${baseAvailable.toLocaleString()}`
            : `Mid-month requests are only available from 14th-15th of each month.${debtWarning}${overtimeInfo}`;
        } else if (requestType === 'end-month') {
          message = paidLastMonth > 0
            ? `End-month requests (28th-31st only). Last month: UGX ${paidLastMonth.toLocaleString()}.${debtWarning}${overtimeInfo} Full balance: UGX ${baseAvailable.toLocaleString()}`
            : `End-month requests are only available from 28th-31st of each month.${debtWarning}${overtimeInfo}`;
        } else {
          message = `This request type is not available in the current period.${debtWarning}${overtimeInfo}`;
        }
      } else if (periodType === 'mid-month') {
        availableAmount = maxAmount - alreadyRequested;
        canRequest = availableAmount > 0;
        
        const debtInfo = advancesOwed > 0 ? ` Advances owed: UGX ${advancesOwed.toLocaleString()}.` : '';
        const overtimeInfo = overtimeEarned > 0 ? ` Overtime: +UGX ${overtimeEarned.toLocaleString()}.` : '';
        if (canRequest) {
          message = paidLastMonth > 0
            ? `Available: UGX ${availableAmount.toLocaleString()} of UGX ${maxAmount.toLocaleString()} (Full Balance).${debtInfo}${overtimeInfo} Last month: UGX ${paidLastMonth.toLocaleString()}. Requested: UGX ${alreadyRequested.toLocaleString()}`
            : `Available: UGX ${availableAmount.toLocaleString()} of UGX ${maxAmount.toLocaleString()} (Full Balance).${debtInfo}${overtimeInfo} Requested: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your mid-month full balance.${debtInfo}${overtimeInfo}`;
        }
      } else if (periodType === 'end-month') {
        // For end-month, available is base minus what was already requested this month
        availableAmount = baseAvailable - alreadyRequested;
        canRequest = availableAmount > 0;
        
        const debtInfo = advancesOwed > 0 ? ` Advances owed: UGX ${advancesOwed.toLocaleString()}.` : '';
        const overtimeInfo = overtimeEarned > 0 ? ` Overtime: +UGX ${overtimeEarned.toLocaleString()}.` : '';
        if (canRequest) {
          message = paidLastMonth > 0
            ? `Available: UGX ${availableAmount.toLocaleString()} of UGX ${baseAvailable.toLocaleString()}.${debtInfo}${overtimeInfo} Last month: UGX ${paidLastMonth.toLocaleString()}. Requested: UGX ${alreadyRequested.toLocaleString()}`
            : `Available: UGX ${availableAmount.toLocaleString()}.${debtInfo}${overtimeInfo} Requested: UGX ${alreadyRequested.toLocaleString()}`;
        } else {
          message = `You have already requested your full available balance.${debtInfo}${overtimeInfo}`;
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
        baseAvailable,
        advancesOwed,
        overtimeEarned
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
        baseAvailable: 0,
        advancesOwed: 0,
        overtimeEarned: 0
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
