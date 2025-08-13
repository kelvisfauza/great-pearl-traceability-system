
import { useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const hasSetLoginTime = useRef<boolean>(false);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    const uid = userId || user?.uid;
    if (!uid) return;

    try {
      const presenceRef = doc(db, 'presence', uid);

      // Build base payload
      const payload: Record<string, any> = {
        status,
        last_seen: serverTimestamp(),
        name: employee?.name || user?.displayName || user?.email || 'User',
        email: user?.email ?? null,
        department: employee?.department ?? null,
        role: employee?.role ?? null,
      };

      // Set login_time once per session when going online
      if (status === 'online' && !hasSetLoginTime.current) {
        payload.login_time = serverTimestamp();
        hasSetLoginTime.current = true;
      }

      await setDoc(presenceRef, payload, { merge: true });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId, user?.uid, user?.email, user?.displayName, employee?.name, employee?.department, employee?.role]);

  const setOffline = useCallback(async () => {
    await updatePresence('offline');
  }, [updatePresence]);

  useEffect(() => {
    const uid = userId || user?.uid;
    if (!uid) return;

    // Set user as online when hook mounts
    updatePresence('online');

    // Set up event listeners for when user becomes inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [userId, user?.uid, updatePresence, setOffline]);

  return { updatePresence };
};
