import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    // Use authUserId if available, otherwise fall back to user.id
    const id = userId || employee?.authUserId || user?.id;
    if (!id || !employee) {
      console.log('❌ Cannot update presence - missing data:', { id, hasEmployee: !!employee, employee });
      return;
    }

    try {
      console.log('✅ Updating presence:', status, 'for user:', employee.email, 'with ID:', id);
      
      if (!channelRef.current) {
        // Initialize presence channel
        console.log('📡 Initializing presence channel');
        channelRef.current = supabase.channel('online-users');
      }

      // Track presence with user details
      const presenceData = {
        user_id: id,
        email: employee.email,
        name: employee.name,
        department: employee.department,
        role: employee.role,
        status: status,
        online_at: new Date().toISOString(),
      };
      
      console.log('📤 Tracking presence with data:', presenceData);
      await channelRef.current.track(presenceData);
      console.log('✅ Presence tracked successfully');

    } catch (error) {
      console.error('❌ Error updating presence:', error);
    }
  }, [userId, user?.id, employee]);

  const setOffline = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  }, []);

  useEffect(() => {
    // Use authUserId if available, otherwise fall back to user.id
    const id = userId || employee?.authUserId || user?.id;
    if (!id || !employee) {
      console.log('⏭️ Skipping presence initialization - missing data:', { 
        hasId: !!id, 
        hasEmployee: !!employee,
        userId: user?.id,
        authUserId: employee?.authUserId,
        employeeEmail: employee?.email 
      });
      return;
    }

    console.log('🚀 Initializing presence tracking for:', employee.email, 'with ID:', id, '(authUserId:', employee.authUserId, ')');

    // Create and subscribe to presence channel
    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      console.log('📡 Presence channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Presence channel subscribed, tracking user as online');
        await updatePresence('online');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Presence channel error');
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