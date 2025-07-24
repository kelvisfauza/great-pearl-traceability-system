
import { useEffect, useCallback } from 'react';
// Remove supabase import - will be handled by compatibility layer

export const usePresence = (userId?: string) => {
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    if (!userId) return;

    try {
      // Temporarily do nothing - will be implemented with Firebase later
      console.log('Would update presence:', { userId, status });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId]); // Use Firebase User.uid

  const setOffline = useCallback(async () => {
    await updatePresence('offline');
  }, [updatePresence]);

  useEffect(() => {
    if (!userId) return;

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
  }, [userId, updatePresence, setOffline]);

  return { updatePresence };
};
