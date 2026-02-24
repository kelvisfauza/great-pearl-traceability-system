import { useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

const RAPID_VISIT_THRESHOLD = 4;
const RAPID_VISIT_WINDOW_MS = 20000; // 20 seconds
const LEGACY_STORAGE_KEY = 'fraud_nav_timestamps';
const AUTH_ROUTES = ['/auth', '/login', '/signup', '/reset-password'];

type NavigationVisit = {
  path: string;
  timestamp: number;
};

const getStorageKey = (userId: string) => `fraud_nav_timestamps:${userId}`;

const readVisits = (userId: string): NavigationVisit[] => {
  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is NavigationVisit =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as NavigationVisit).path === 'string' &&
        typeof (entry as NavigationVisit).timestamp === 'number'
    );
  } catch {
    return [];
  }
};

const writeVisits = (userId: string, visits: NavigationVisit[]) => {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(visits));
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

    try {
      const { data: existingLock, error: existingLockError } = await supabase
        .from('user_fraud_locks')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_locked', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLockError) {
        console.error('Failed checking existing fraud lock:', existingLockError);
      }

      if (existingLock) {
        onFraudDetected();
        return;
      }

      alreadyLocked.current = true;

      const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();
      const userName = employee?.name || (user.user_metadata as any)?.name || user.email || 'User';
      const userEmail = employee?.email || user.email || '';

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

  const shouldLockWithAI = useCallback(
    async (visits: NavigationVisit[]) => {
      if (!user?.id) return false;

      try {
        const userName = employee?.name || (user.user_metadata as any)?.name || user.email || 'User';
        const userEmail = employee?.email || user.email || '';

        const { data, error } = await supabase.functions.invoke('assess-fraud-navigation', {
          body: {
            userId: user.id,
            userName,
            userEmail,
            threshold: RAPID_VISIT_THRESHOLD,
            windowMs: RAPID_VISIT_WINDOW_MS,
            visits: visits.slice(-10),
          },
        });

        if (error) {
          console.error('AI fraud assessment failed:', error);
          return false;
        }

        const shouldLock = Boolean(data?.shouldLock);

        console.log('AI fraud decision:', {
          shouldLock,
          confidence: data?.confidence,
          reason: data?.reason,
        });

        return shouldLock;
      } catch (err) {
        console.error('Error during AI fraud assessment:', err);
        return false;
      }
    },
    [user, employee]
  );

  useEffect(() => {
    if (!user?.id) return;

    const currentPath = location.pathname.toLowerCase();
    const onAuthRoute = AUTH_ROUTES.some((route) => currentPath.startsWith(route));

    if (onAuthRoute) {
      writeVisits(user.id, []);
      clearLegacyTimestamps();
      return;
    }

    const now = Date.now();
    const recentVisits = readVisits(user.id).filter((visit) => now - visit.timestamp < RAPID_VISIT_WINDOW_MS);
    const lastVisit = recentVisits[recentVisits.length - 1];
    const isRealPathChange = !lastVisit || lastVisit.path !== currentPath;

    const updatedVisits = isRealPathChange
      ? [...recentVisits, { path: currentPath, timestamp: now }]
      : recentVisits;

    writeVisits(user.id, updatedVisits);

    if (!isRealPathChange) {
      console.log('Fraud check skipped: same route refresh detected.');
      return;
    }

    console.log(
      `Fraud check: ${updatedVisits.length} page changes in last ${RAPID_VISIT_WINDOW_MS / 1000}s (threshold: ${RAPID_VISIT_THRESHOLD})`
    );

    if (updatedVisits.length >= RAPID_VISIT_THRESHOLD) {
      console.warn('Rapid navigation threshold reached. Requesting AI fraud assessment.');
      writeVisits(user.id, []); // reset burst immediately after reaching threshold

      void (async () => {
        const shouldLock = await shouldLockWithAI(updatedVisits);

        if (shouldLock) {
          console.warn('AI fraud detection confirmed suspicious behavior. Locking account.');
          await triggerLock();
        } else {
          console.log('AI fraud detection marked activity as normal work. No lock applied.');
        }
      })();
    }
  }, [location.pathname, user?.id, triggerLock, shouldLockWithAI]);
};
