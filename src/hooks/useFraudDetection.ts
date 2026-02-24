import { useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

const RAPID_VISIT_THRESHOLD = 10; // 10 rapid page changes
const RAPID_VISIT_WINDOW_MS = 20000; // within 20 seconds
const LEGACY_STORAGE_KEY = 'fraud_nav_timestamps';
const AUTH_ROUTES = ['/auth', '/login', '/signup', '/reset-password'];

const getStorageKey = (userId: string) => `fraud_nav_timestamps:${userId}`;

const readTimestamps = (userId: string): number[] => {
  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number') : [];
  } catch {
    return [];
  }
};

const writeTimestamps = (userId: string, timestamps: number[]) => {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(timestamps));
  } catch {
    // ignore storage failures
  }
};

const clearLegacyTimestamps = () => {
  try {
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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

    const currentPath = location.pathname.toLowerCase();
    const onAuthRoute = AUTH_ROUTES.some((route) => currentPath.startsWith(route));

    if (onAuthRoute) {
      writeTimestamps(user.id, []);
      clearLegacyTimestamps();
      return;
    }

    const now = Date.now();
    const timestamps = readTimestamps(user.id);
    const updated = [...timestamps, now].filter((t) => now - t < RAPID_VISIT_WINDOW_MS);
    writeTimestamps(user.id, updated);

    console.log(
      `Fraud check: ${updated.length} page changes in last ${RAPID_VISIT_WINDOW_MS / 1000}s (threshold: ${RAPID_VISIT_THRESHOLD})`
    );

    if (updated.length >= RAPID_VISIT_THRESHOLD) {
      console.warn('Fraud detection: Rapid page browsing detected. Locking account.');
      writeTimestamps(user.id, []); // reset burst immediately
      triggerLock();
    }
  }, [location.pathname, user?.id, triggerLock]);
};
