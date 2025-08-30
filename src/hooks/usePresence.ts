
import { useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const hasSetLoginTime = useRef<boolean>(false);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    const id = userId || user?.id;
    if (!id) return;

    try {
      const presenceRef = doc(db, 'presence', id);

      // Build base payload
      const payload: Record<string, any> = {
        status,
        last_seen: serverTimestamp(),
        name: employee?.name || user?.email?.split('@')[0] || 'User',
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
  }, [userId, user?.id, user?.email, employee?.name, employee?.department, employee?.role]);

  const setOffline = useCallback(async () => {
    await updatePresence('offline');
  }, [updatePresence]);

  useEffect(() => {
    const id = userId || user?.id;
    if (!id) return;

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
  }, [userId, user?.id, updatePresence, setOffline]);

  return { updatePresence };
};
