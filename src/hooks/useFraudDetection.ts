import { useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

const RAPID_VISIT_THRESHOLD = 4; // 4 rapid page changes
const RAPID_VISIT_WINDOW_MS = 15000; // within 15 seconds
const MIN_PAGE_STAY_MS = 2000; // if user stays less than 2s, it's suspicious

export const useFraudDetection = (onFraudDetected: () => void) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const employee = authContext?.employee;
  const location = useLocation();
  const pageVisitTimestamps = useRef<number[]>([]);
  const lastPageTime = useRef<number>(Date.now());
  const alreadyLocked = useRef(false);

  const triggerLock = useCallback(async () => {
    if (!user?.id || !employee || alreadyLocked.current) return;
    alreadyLocked.current = true;

    // Generate 6-digit unlock code
    const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // Insert fraud lock record
      await supabase.from('user_fraud_locks').insert([{
        user_id: user.id,
        user_email: employee.email || user.email || '',
        user_name: employee.name || '',
        unlock_code: unlockCode,
        reason: 'Suspected rapid page browsing to earn loyalty rewards without productive activity',
      }]);

      // Send SMS to admins with the unlock code
      const { data: admins } = await supabase
        .from('employees')
        .select('name, phone')
        .in('role', ['Administrator', 'Super Admin'])
        .eq('status', 'Active');

      if (admins) {
        for (const admin of admins) {
          if (admin.phone) {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: admin.phone,
                message: `ALERT: ${employee.name || user.email} has been locked for suspected reward fraud. Unlock code: ${unlockCode}. Enter this code on their screen to unlock.`,
                userName: admin.name,
                messageType: 'fraud_alert'
              }
            });
          }
        }
      }

      onFraudDetected();
    } catch (err) {
      console.error('Error creating fraud lock:', err);
    }
  }, [user, employee, onFraudDetected]);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastPage = now - lastPageTime.current;
    lastPageTime.current = now;

    // Only count if user stayed less than 2 seconds on previous page
    if (timeSinceLastPage < MIN_PAGE_STAY_MS && timeSinceLastPage > 100) {
      pageVisitTimestamps.current.push(now);

      // Remove timestamps outside the window
      pageVisitTimestamps.current = pageVisitTimestamps.current.filter(
        t => now - t < RAPID_VISIT_WINDOW_MS
      );

      // Check if threshold reached
      if (pageVisitTimestamps.current.length >= RAPID_VISIT_THRESHOLD) {
        console.warn('Fraud detection: Rapid page browsing detected!');
        triggerLock();
      }
    }
  }, [location.pathname, triggerLock]);
};
