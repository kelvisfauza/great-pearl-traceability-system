import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePresenceDB = useCallback(async (status: 'online' | 'away' | 'offline') => {
    const authUserId = employee?.authUserId || (employee as any)?.auth_user_id;
    const id = userId || authUserId || user?.id;
    
    if (!id) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: id,
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId, user?.id, employee]);

  useEffect(() => {
    const authUserId = employee?.authUserId || (employee as any)?.auth_user_id;
    const id = userId || authUserId || user?.id;
    
    if (!id || !employee) return;

    // Set online immediately
    updatePresenceDB('online');

    // Heartbeat every 60 seconds to keep presence fresh
    heartbeatRef.current = setInterval(() => {
      updatePresenceDB(document.hidden ? 'away' : 'online');
    }, 60000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      updatePresenceDB(document.hidden ? 'away' : 'online');
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable unload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${id}`;
      const body = JSON.stringify({ status: 'offline', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() });
      navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
      updatePresenceDB('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      updatePresenceDB('offline');
    };
  }, [userId, user?.id, employee, updatePresenceDB]);

  return { updatePresence: updatePresenceDB };
};
