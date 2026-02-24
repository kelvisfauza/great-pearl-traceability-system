import { useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

const RAPID_VISIT_THRESHOLD = 4; // 4 rapid page changes
const RAPID_VISIT_WINDOW_MS = 15000; // within 15 seconds
const STORAGE_KEY = 'fraud_nav_timestamps';

const readTimestamps = (): number[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number') : [];
  } catch {
    return [];
  }
};

const writeTimestamps = (timestamps: number[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // ignore storage failures
  }
};

export const useFraudDetection = (onFraudDetected: () => void) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const employee = authContext?.employee;
  const location = useLocation();
  const alreadyLocked = useRef(false);

  const triggerLock = useCallback(async () => {
    if (!user?.id || alreadyLocked.current) return;
    alreadyLocked.current = true;

    const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();
    const userName = employee?.name || (user.user_metadata as any)?.name || user.email || 'User';
    const userEmail = employee?.email || user.email || '';

    try {
      const { error: lockInsertError } = await supabase.from('user_fraud_locks').insert([
        {
          user_id: user.id,
          user_email: userEmail,
          user_name: userName,
          unlock_code: unlockCode,
          reason: 'Suspected rapid page browsing to earn loyalty rewards without productive activity',
        },
      ]);

      if (lockInsertError) {
        console.error('Fraud lock insert failed:', lockInsertError);
        alreadyLocked.current = false;
        return;
      }

      const { data: admins, error: adminsError } = await supabase
        .from('employees')
        .select('name, phone')
        .in('role', ['Administrator', 'Super Admin'])
        .eq('status', 'Active');

      if (adminsError) {
        console.error('Failed to fetch admins for fraud SMS:', adminsError);
      }

      if (admins) {
        for (const admin of admins) {
          if (!admin.phone) continue;

          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: admin.phone,
              message: `Alert: ${userName} has been locked for suspected reward fraud. Unlock code: ${unlockCode}. Enter this code on user screen to unlock.`,
              userName: admin.name,
              messageType: 'fraud_alert',
            },
          });

          if (smsError) {
            console.error('Fraud SMS failed for admin:', admin.name, smsError);
          }
        }
      }

      onFraudDetected();
    } catch (err) {
      console.error('Error creating fraud lock:', err);
      alreadyLocked.current = false;
    }
  }, [user, employee, onFraudDetected]);

  useEffect(() => {
    if (!user?.id) return;

    const now = Date.now();
    const timestamps = readTimestamps();
    const updated = [...timestamps, now].filter((t) => now - t < RAPID_VISIT_WINDOW_MS);
    writeTimestamps(updated);

    console.log(
      `Fraud check: ${updated.length} page changes in last ${RAPID_VISIT_WINDOW_MS / 1000}s (threshold: ${RAPID_VISIT_THRESHOLD})`
    );

    if (updated.length >= RAPID_VISIT_THRESHOLD) {
      console.warn('Fraud detection: Rapid page browsing detected. Locking account.');
      writeTimestamps([]); // reset burst immediately
      triggerLock();
    }
  }, [location.pathname, user?.id, triggerLock]);
};
