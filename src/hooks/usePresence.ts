import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const hasSetLoginTime = useRef(false);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    const id = userId || user?.id;
    if (!id) return;

    try {
      console.log('Presence update:', status, 'for user:', id);
      // Presence functionality temporarily disabled
      // Will be implemented with Supabase realtime when needed
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

    // Presence tracking temporarily disabled
    // Will be implemented with Supabase realtime when needed

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