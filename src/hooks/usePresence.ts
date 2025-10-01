import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    const id = userId || user?.id;
    if (!id || !employee) return;

    try {
      console.log('Updating presence:', status, 'for user:', employee.email);
      
      if (!channelRef.current) {
        // Initialize presence channel
        channelRef.current = supabase.channel('online-users');
      }

      // Track presence with user details
      await channelRef.current.track({
        user_id: id,
        email: employee.email,
        name: employee.name,
        department: employee.department,
        role: employee.role,
        status: status,
        online_at: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId, user?.id, employee]);

  const setOffline = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  }, []);

  useEffect(() => {
    const id = userId || user?.id;
    if (!id || !employee) return;

    console.log('Initializing presence tracking for:', employee.email);

    // Create and subscribe to presence channel
    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Presence channel subscribed, tracking user as online');
        await updatePresence('online');
      }
    });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log('Cleaning up presence tracking');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, user?.id, employee, updatePresence, setOffline]);

  return { updatePresence };
};