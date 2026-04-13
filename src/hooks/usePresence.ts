import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LocationInfo {
  ip: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

/**
 * Parse real device model from User-Agent string.
 * Mobile devices expose model info; desktops show OS details.
 */
const detectDeviceModel = (ua: string): string => {
  // Samsung devices: "SM-G998B", "SM-S928B", etc.
  const samsungMatch = ua.match(/SM-[A-Z]\d{3}[A-Z]?/i);
  if (samsungMatch) {
    return mapSamsungModel(samsungMatch[0]);
  }

  // Generic Android device: "Build/..." preceded by device name
  const androidMatch = ua.match(/;\s*([^;)]+?)\s*Build\//);
  if (androidMatch) {
    const model = androidMatch[1].trim();
    // Clean up common prefixes
    if (model.startsWith('SM-')) return mapSamsungModel(model);
    if (model.length > 2 && model.length < 40) return model;
  }

  // iPhone/iPad
  if (ua.includes('iPhone')) {
    return 'iPhone';
  }
  if (ua.includes('iPad')) {
    return 'iPad';
  }

  // Huawei
  const huaweiMatch = ua.match(/HUAWEI\s+([A-Za-z0-9-]+)/i);
  if (huaweiMatch) return `Huawei ${huaweiMatch[1]}`;

  // Xiaomi / Redmi / POCO
  const xiaomiMatch = ua.match(/(Redmi|POCO|Mi)\s+([A-Za-z0-9\s]+?)(?:\s*Build|[;)])/i);
  if (xiaomiMatch) return `${xiaomiMatch[1]} ${xiaomiMatch[2].trim()}`;

  // Tecno
  const tecnoMatch = ua.match(/TECNO\s+([A-Za-z0-9-]+)/i);
  if (tecnoMatch) return `Tecno ${tecnoMatch[1]}`;

  // Infinix
  const infinixMatch = ua.match(/Infinix\s+([A-Za-z0-9-]+)/i);
  if (infinixMatch) return `Infinix ${infinixMatch[1]}`;

  // itel
  const itelMatch = ua.match(/itel\s+([A-Za-z0-9-]+)/i);
  if (itelMatch) return `itel ${itelMatch[1]}`;

  // Desktop fallback
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux PC';
  if (ua.includes('CrOS')) return 'Chromebook';

  return 'Unknown Device';
};

const mapSamsungModel = (code: string): string => {
  const c = code.toUpperCase();
  // Galaxy S series (recent)
  if (c.startsWith('SM-S928')) return 'Samsung Galaxy S24 Ultra';
  if (c.startsWith('SM-S926')) return 'Samsung Galaxy S24+';
  if (c.startsWith('SM-S921')) return 'Samsung Galaxy S24';
  if (c.startsWith('SM-S918')) return 'Samsung Galaxy S23 Ultra';
  if (c.startsWith('SM-S916')) return 'Samsung Galaxy S23+';
  if (c.startsWith('SM-S911')) return 'Samsung Galaxy S23';
  if (c.startsWith('SM-S908')) return 'Samsung Galaxy S22 Ultra';
  if (c.startsWith('SM-S906')) return 'Samsung Galaxy S22+';
  if (c.startsWith('SM-S901')) return 'Samsung Galaxy S22';
  if (c.startsWith('SM-G998')) return 'Samsung Galaxy S21 Ultra';
  if (c.startsWith('SM-G996')) return 'Samsung Galaxy S21+';
  if (c.startsWith('SM-G991')) return 'Samsung Galaxy S21';
  // Galaxy A series
  if (c.startsWith('SM-A546')) return 'Samsung Galaxy A54';
  if (c.startsWith('SM-A536')) return 'Samsung Galaxy A53';
  if (c.startsWith('SM-A346')) return 'Samsung Galaxy A34';
  if (c.startsWith('SM-A256')) return 'Samsung Galaxy A25';
  if (c.startsWith('SM-A156')) return 'Samsung Galaxy A15';
  if (c.startsWith('SM-A057')) return 'Samsung Galaxy A05s';
  // Fallback
  return `Samsung ${c}`;
};

const detectBrowser = (ua: string): string => {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown Browser';
};

const detectOS = (ua: string): string => {
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
  if (ua.includes('Android')) {
    const ver = ua.match(/Android\s+([\d.]+)/);
    return ver ? `Android ${ver[1]}` : 'Android';
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const ver = ua.match(/OS\s+([\d_]+)/);
    return ver ? `iOS ${ver[1].replace(/_/g, '.')}` : 'iOS';
  }
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('CrOS')) return 'ChromeOS';
  return 'Unknown OS';
};

const detectDeviceType = (ua: string): string => {
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return 'Mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'Tablet';
  return 'Desktop';
};

/**
 * Get precise GPS location using browser Geolocation API,
 * then reverse geocode to a street-level address.
 */
const fetchPreciseLocation = (): Promise<{ latitude: number; longitude: number; address: string } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode using OpenStreetMap Nominatim (free, no key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en' },
              signal: AbortSignal.timeout(8000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            // Build a readable address: road, suburb/neighbourhood, city/town
            const parts = [
              addr.road,
              addr.suburb || addr.neighbourhood || addr.hamlet,
              addr.city || addr.town || addr.village,
              addr.county || addr.district,
            ].filter(Boolean);
            const address = parts.join(', ') || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            resolve({ latitude, longitude, address });
          } else {
            resolve({ latitude, longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          }
        } catch {
          resolve({ latitude, longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        }
      },
      () => {
        // User denied or error - resolve null
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
};

const fetchIPLocation = async (): Promise<{ ip: string; city: string; country: string }> => {
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
  const gpsRef = useRef<{ latitude: number; longitude: number; address: string } | null>(null);
  const sessionLogIdRef = useRef<string | null>(null);

  const updatePresenceDB = useCallback(async (status: 'online' | 'away' | 'offline') => {
    const authUserId = employee?.authUserId || (employee as any)?.auth_user_id;
    const id = userId || authUserId || user?.id;
    if (!id) return;

    const ua = navigator.userAgent;
    const browser = detectBrowser(ua);
    const os = detectOS(ua);
    const deviceType = detectDeviceType(ua);
    const deviceModel = detectDeviceModel(ua);

    try {
      const upsertData: any = {
        user_id: id,
        status,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        browser,
        os,
        device_type: deviceType,
        device_model: deviceModel,
      };

      if (locationRef.current) {
        upsertData.ip_address = locationRef.current.ip;
        upsertData.city = locationRef.current.city;
        upsertData.country = locationRef.current.country;
      }

      if (gpsRef.current) {
        upsertData.latitude = gpsRef.current.latitude;
        upsertData.longitude = gpsRef.current.longitude;
        upsertData.location_address = gpsRef.current.address;
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

    const ua = navigator.userAgent;
    const browser = detectBrowser(ua);
    const os = detectOS(ua);
    const deviceType = detectDeviceType(ua);
    const deviceModel = detectDeviceModel(ua);

    // Fetch all location data in parallel, then go online
    const init = async () => {
      const [ipData, gpsData] = await Promise.all([
        fetchIPLocation(),
        fetchPreciseLocation(),
      ]);

      locationRef.current = ipData;
      gpsRef.current = gpsData || null;

      updatePresenceDB('online');

      // Create session log
      try {
        const { data } = await supabase
          .from('user_session_logs')
          .insert({
            user_id: id,
            employee_name: employee?.name || null,
            employee_email: employee?.email || null,
            ip_address: ipData.ip,
            city: ipData.city,
            country: ipData.country,
            latitude: gpsData?.latitude || null,
            longitude: gpsData?.longitude || null,
            location_address: gpsData?.address || null,
            browser,
            os,
            device_type: deviceType,
            device_model: deviceModel,
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
