import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePresence = (userId?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const updatePresence = useCallback(async (isOnline: boolean = true) => {
    if (!userId) return;

    try {
      console.log('Updating presence for user:', userId, 'online:', isOnline);
      
      // Mock presence update - in real implementation would use Supabase
      if (isOnline) {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Set user as online when component mounts
    updatePresence(true);

    // Mock subscription to online users - in real implementation would use Supabase realtime
    console.log('Subscribing to online users');

    // Cleanup function to set user as offline
    return () => {
      updatePresence(false);
      console.log('Unsubscribing from online users');
    };
  }, [userId, updatePresence]);

  const isUserOnline = useCallback((checkUserId: string) => {
    return onlineUsers.includes(checkUserId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    updatePresence,
    isUserOnline
  };
};