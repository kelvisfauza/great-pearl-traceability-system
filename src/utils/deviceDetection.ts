import { supabase } from '@/integrations/supabase/client';

const APP_URL = 'https://greatpearlcoffeesystem.site';

/** Mark the current device trusted (used after the user passes the login verification code). */
export const trustCurrentDevice = async (userEmail: string, authUserId?: string) => {
  try {
    await trustFirstDevice(userEmail, authUserId);
  } catch (e) {
    console.error('trustCurrentDevice failed', e);
  }
};

/**
 * Generate a simple device fingerprint from browser properties.
 * This is NOT cryptographically secure — it's meant as a practical identifier
 * for detecting "obviously different" devices (phone vs desktop, new browser, etc.)
 */
export const generateDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 'unknown',
  ];
  
  // Simple hash
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Parse browser and OS from user agent string
 */
export const parseUserAgent = (ua: string) => {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Browser detection
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // OS detection
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser, os };
};

export interface DeviceDetails {
  device_name?: string;
  os_version?: string;
  latitude?: number;
  longitude?: number;
  location_label?: string;
}

/**
 * Collect rich device details: model name, OS version, and GPS location.
 * Uses the Capacitor Device/Geolocation plugins inside the native app,
 * and falls back to user-agent parsing + browser geolocation on the web.
 * Never throws — returns whatever could be gathered.
 */
export const collectDeviceDetails = async (): Promise<DeviceDetails> => {
  const details: DeviceDetails = {};
  const ua = navigator.userAgent;

  // 1) Parse Android version + device model from the user agent
  const androidMatch = ua.match(/Android\s([\d.]+)/i);
  if (androidMatch) details.os_version = `Android ${androidMatch[1]}`;
  const modelMatch = ua.match(/Android[\d.\s]*;\s*([^;)]+)/i);
  if (modelMatch) {
    const model = modelMatch[1].trim();
    if (model && !/^(wv|en-|sw-|U;?)$/i.test(model)) details.device_name = model;
  }
  const iosMatch = ua.match(/OS\s([\d_]+)\slike Mac OS X/i);
  if (iosMatch) details.os_version = `iOS ${iosMatch[1].replace(/_/g, '.')}`;

  // 2) Native app: ask the Capacitor Device plugin for the real model + OS version
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      if (info.model) details.device_name = info.model;
      if (info.osVersion) details.os_version = `${info.operatingSystem === 'ios' ? 'iOS' : 'Android'} ${info.osVersion}`;
      if (info.manufacturer && details.device_name && !details.device_name.toLowerCase().includes(info.manufacturer.toLowerCase())) {
        details.device_name = `${info.manufacturer} ${details.device_name}`;
      }
    }
  } catch { /* web fallback already parsed above */ }

  // 3) GPS location (native plugin first, browser geolocation as fallback)
  let coords: { latitude: number; longitude: number } | null = null;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({ timeout: 8000 });
      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }
  } catch { /* permission denied or unavailable */ }
  if (!coords && 'geolocation' in navigator) {
    coords = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  }
  if (coords) {
    details.latitude = Math.round(coords.latitude * 1e6) / 1e6;
    details.longitude = Math.round(coords.longitude * 1e6) / 1e6;
    // 4) Reverse-geocode to a human-readable place name (OpenStreetMap)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=14`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const geo = await res.json();
        const a = geo.address || {};
        const place = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county;
        const region = a.state || a.country;
        details.location_label = [place, region].filter(Boolean).join(', ') || geo.display_name?.split(',').slice(0, 2).join(',');
      }
    } catch { /* keep coordinates only */ }
  }

  return details;
};

/**
 * Check if the current device is trusted for this user.
 * Returns { trusted: true } if recognized, or { trusted: false, token, deviceId } if new.
 */
export const checkDeviceTrust = async (
  userEmail: string,
  authUserId?: string
): Promise<{ trusted: boolean; token?: string; deviceId?: string }> => {
  const fingerprint = generateDeviceFingerprint();
  const { browser, os } = parseUserAgent(navigator.userAgent);
  const details = await collectDeviceDetails();

  // Check if this device is already trusted
  const { data: existing } = await supabase
    .from('device_sessions')
    .select('id, is_trusted, rejected_at')
    .eq('user_email', userEmail)
    .eq('device_fingerprint', fingerprint)
    .maybeSingle();

  if (existing?.is_trusted) {
    // Update last_seen + refresh device details (model, OS version, location)
    await supabase
      .from('device_sessions')
      .update({ last_seen_at: new Date().toISOString(), ...details })
      .eq('id', existing.id);
    return { trusted: true };
  }

  if ((existing as any)?.rejected_at) {
    return { trusted: false, rejected: true } as any;
  }

  if (existing && !existing.is_trusted) {
    // Device exists but not yet trusted - regenerate token
    const newToken = crypto.randomUUID() + '-' + Date.now().toString(36);
    await supabase
      .from('device_sessions')
      .update({
        verification_token: newToken,
        token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        token_used_at: null,
        last_seen_at: new Date().toISOString(),
        ...details,
      })
      .eq('id', existing.id);
    
    return { trusted: false, token: newToken, deviceId: existing.id };
  }

  // New device — insert and send alert email
  const token = crypto.randomUUID() + '-' + Date.now().toString(36);
  const { data: newDevice, error } = await supabase
    .from('device_sessions')
    .insert({
      user_email: userEmail,
      auth_user_id: authUserId || null,
      device_fingerprint: fingerprint,
      user_agent: navigator.userAgent.substring(0, 500),
      browser,
      os,
      is_trusted: false,
      verification_token: token,
      token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      ...details,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create device session:', error);
    // On error, allow login (don't block user)
    return { trusted: true };
  }

  return { trusted: false, token, deviceId: newDevice.id };
};

/**
 * Send the new device alert email to the user.
 */
export const sendNewDeviceAlertEmail = async (
  userEmail: string,
  employeeName: string,
  token: string
) => {
  const { browser, os } = parseUserAgent(navigator.userAgent);
  const details = await collectDeviceDetails();
  const deviceLabel = [details.device_name, details.os_version || os].filter(Boolean).join(' — ') || `${browser} on ${os}`;
  const locationLabel = details.location_label
    || (details.latitude != null ? `${details.latitude}, ${details.longitude}` : 'Unknown location');
  const verifyUrl = `${APP_URL}/verify-device?token=${token}`;
  const loginTime = new Date().toLocaleString('en-UG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kampala'
  });

  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'new-device-alert',
        recipientEmail: userEmail,
        idempotencyKey: `new-device-${userEmail}-${token}`,
        templateData: {
          employeeName,
          browser,
          os,
          deviceName: deviceLabel,
          location: locationLabel,
          loginTime,
          verifyUrl,
        },
      },
    });
    console.log('📧 New device alert email sent to:', userEmail);
  } catch (err) {
    console.error('Failed to send new device alert email:', err);
  }
};

/**
 * Trust the first device for a user automatically (bootstrap).
 * Call this only when a user has zero devices registered.
 */
export const trustFirstDevice = async (userEmail: string, authUserId?: string) => {
  const fingerprint = generateDeviceFingerprint();
  const { browser, os } = parseUserAgent(navigator.userAgent);
  const details = await collectDeviceDetails();

  await supabase
    .from('device_sessions')
    .upsert({
      user_email: userEmail,
      auth_user_id: authUserId || null,
      device_fingerprint: fingerprint,
      user_agent: navigator.userAgent.substring(0, 500),
      browser,
      os,
      is_trusted: true,
      token_used_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      ...details,
    }, { onConflict: 'user_email,device_fingerprint' });

  console.log('🔐 First device auto-trusted for:', userEmail);
};
