import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { parseUserAgent } from '@/utils/deviceDetection';

interface LocationInfo {
  ip: string;
  city: string;
  country: string;
}

const detectDeviceType = (ua: string): string => {
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return 'Mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'Tablet';
  return 'Desktop';
};

const fetchLocation = async (): Promise<LocationInfo> => {
  try {
    const res = await fetch('http://ip-api.com/json/?fields=query,city,country', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { ip: data.query || 'unknown', city: data.city || 'unknown', country: data.country || 'unknown' };
    }
  } catch { /* silent */ }

  try {
    const { data } = await supabase.functions.invoke('detect-ip');
    return { ip: data?.ip || 'unknown', city: 'unknown', country: 'unknown' };
  } catch {
    return { ip: 'unknown', city: 'unknown', country: 'unknown' };
  }
};

export const usePresence = (userId?: string) => {
  const { user, employee } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<LocationInfo | null>(null);
  const sessionLogIdRef = useRef<string | null>(null);

  const updatePresenceDB = useCallback(async (status: 'online' | 'away' | 'offline') => {
    const authUserId = employee?.authUserId || (employee as any)?.auth_user_id;
    const id = userId || authUserId || user?.id;
    
    if (!id) return;

    const { browser, os } = parseUserAgent(navigator.userAgent);
    const deviceType = detectDeviceType(navigator.userAgent);

    try {
      const upsertData: any = {
        user_id: id,
        status,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        browser,
        os,
        device_type: deviceType,
      };

      // Add location if available
      if (locationRef.current) {
        upsertData.ip_address = locationRef.current.ip;
        upsertData.city = locationRef.current.city;
        upsertData.country = locationRef.current.country;
      }

      await supabase
        .from('user_presence')
        .upsert(upsertData, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId, user?.id, employee]);

  useEffect(() => {
    const authUserId = employee?.authUserId || (employee as any)?.auth_user_id;
    const id = userId || authUserId || user?.id;
    
    if (!id || !employee) return;

    // Fetch location once on mount, then set online
    const init = async () => {
      locationRef.current = await fetchLocation();
      updatePresenceDB('online');

      // Create a session log entry
      const { browser, os } = parseUserAgent(navigator.userAgent);
      const deviceType = detectDeviceType(navigator.userAgent);
      try {
        const { data } = await supabase
          .from('user_session_logs')
          .insert({
            user_id: id,
            employee_name: employee?.name || null,
            employee_email: employee?.email || null,
            ip_address: locationRef.current?.ip || null,
            city: locationRef.current?.city || null,
            country: locationRef.current?.country || null,
            browser,
            os,
            device_type: deviceType,
          })
          .select('id')
          .single();
        if (data) sessionLogIdRef.current = data.id;
      } catch (err) {
        console.error('Failed to create session log:', err);
      }
    };
    init();

    // Heartbeat every 60 seconds
    heartbeatRef.current = setInterval(() => {
      updatePresenceDB(document.hidden ? 'away' : 'online');
    }, 60000);

    const handleVisibilityChange = () => {
      updatePresenceDB(document.hidden ? 'away' : 'online');
    };

    const handleBeforeUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${id}`;
      const body = JSON.stringify({ status: 'offline', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() });
      navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));

      // Update session log with logout time
      if (sessionLogIdRef.current) {
        const logUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_session_logs?id=eq.${sessionLogIdRef.current}`;
        const logBody = JSON.stringify({ logout_at: new Date().toISOString() });
        navigator.sendBeacon?.(logUrl, new Blob([logBody], { type: 'application/json' }));
      }

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

      // Close session log
      if (sessionLogIdRef.current) {
        supabase
          .from('user_session_logs')
          .update({ logout_at: new Date().toISOString() })
          .eq('id', sessionLogIdRef.current)
          .then(() => {});
      }

      updatePresenceDB('offline');
    };
  }, [userId, user?.id, employee, updatePresenceDB]);

  return { updatePresence: updatePresenceDB };
};
