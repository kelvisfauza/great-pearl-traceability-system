import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionData {
  sessionToken: string;
  deviceInfo: string;
  userAgent: string;
  ipAddress?: string;
}

export const useSessionManager = (userId: string | null) => {
  const { toast } = useToast();

  // Generate a unique session token
  const generateSessionToken = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get device info
  const getDeviceInfo = useCallback(() => {
    const platform = navigator.platform || 'Unknown';
    const language = navigator.language || 'Unknown';
    return `${platform} - ${language}`;
  }, []);

  // Create a new session record
  const createSession = useCallback(async (userId: string): Promise<string> => {
    const sessionToken = generateSessionToken();
    const deviceInfo = getDeviceInfo();
    const userAgent = navigator.userAgent;

    try {
      // First, invalidate all other sessions for this user
      await supabase.rpc('invalidate_other_sessions', {
        p_user_id: userId,
        p_current_session_token: sessionToken
      });

      // Create new session record
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_info: deviceInfo,
          user_agent: userAgent,
          is_active: true
        });

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      // Store session token in localStorage for session validation
      localStorage.setItem('session_token', sessionToken);
      
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [generateSessionToken, getDeviceInfo]);

  // Validate current session
  const validateSession = useCallback(async (userId: string): Promise<boolean> => {
    const storedToken = localStorage.getItem('session_token');
    
    if (!storedToken) {
      return false;
    }

    try {
      const { data: sessionData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_token', storedToken)
        .eq('is_active', true)
        .single();

      if (error || !sessionData) {
        return false;
      }

      // Update last activity
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', sessionData.id);

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, []);

  // Invalidate current session
  const invalidateSession = useCallback(async (userId: string) => {
    const storedToken = localStorage.getItem('session_token');
    
    if (storedToken && userId) {
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('session_token', storedToken);
      } catch (error) {
        console.error('Error invalidating session:', error);
      }
    }
    
    localStorage.removeItem('session_token');
  }, []);

  // Listen for session conflicts (when another device logs in)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('session-conflicts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const storedToken = localStorage.getItem('session_token');
          
          // If our session was deactivated, sign out
          if (payload.new.session_token === storedToken && !payload.new.is_active) {
            toast({
              title: "Session Ended",
              description: "You have been logged out because you signed in from another device.",
              variant: "destructive",
              duration: 5000
            });
            
            // Clear the session and reload page to trigger logout
            localStorage.removeItem('session_token');
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  // Periodic session validation
  useEffect(() => {
    if (!userId) return;

    const validateInterval = setInterval(async () => {
      const isValid = await validateSession(userId);
      
      if (!isValid) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        
        localStorage.removeItem('session_token');
        window.location.reload();
      }
    }, 60000); // Check every minute

    return () => clearInterval(validateInterval);
  }, [userId, validateSession, toast]);

  return {
    createSession,
    validateSession,
    invalidateSession
  };
};