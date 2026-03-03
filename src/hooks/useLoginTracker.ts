import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tracks employee login time into the employee_login_tracker table.
 * Records one entry per user per day (first login of the day).
 * This is used by the auto-attendance-deduction edge function to determine
 * if an employee logged in before 9:00 AM EAT.
 */
export const useLoginTracker = (userId: string | null, employeeName?: string, employeeEmail?: string, employeeId?: string) => {
  const tracked = useRef(false);

  useEffect(() => {
    if (!userId || tracked.current) return;
    tracked.current = true;

    const trackLogin = async () => {
      try {
        // Use upsert with the unique constraint (auth_user_id, login_date)
        // This ensures only one record per user per day
        const { error } = await supabase
          .from('employee_login_tracker')
          .upsert(
            {
              auth_user_id: userId,
              employee_id: employeeId || null,
              employee_name: employeeName || null,
              employee_email: employeeEmail || null,
              login_date: new Date().toISOString().split('T')[0],
              login_time: new Date().toISOString(),
            },
            { onConflict: 'auth_user_id,login_date', ignoreDuplicates: true }
          );

        if (error) {
          console.error('Login tracker error:', error);
        } else {
          console.log('✅ Login tracked for', employeeEmail || userId);
        }
      } catch (err) {
        console.error('Login tracker failed:', err);
      }
    };

    trackLogin();
  }, [userId, employeeName, employeeEmail, employeeId]);
};
