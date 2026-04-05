import { supabase } from '@/integrations/supabase/client';

const APP_URL = 'https://great-pearl-traceability-system.lovable.app';

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

  // Check if this device is already trusted
  const { data: existing } = await supabase
    .from('device_sessions')
    .select('id, is_trusted')
    .eq('user_email', userEmail)
    .eq('device_fingerprint', fingerprint)
    .maybeSingle();

  if (existing?.is_trusted) {
    // Update last_seen
    await supabase
      .from('device_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { trusted: true };
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
    }, { onConflict: 'user_email,device_fingerprint' });

  console.log('🔐 First device auto-trusted for:', userEmail);
};
