import { buildPublicUrl } from './publicUrl';

/** Realtime channel used to pair a laptop approval with the admin's phone. */
export const approvalChannelName = (sessionId: string) => `fp-approve-${sessionId}`;

export const newApprovalSessionId = () =>
  (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);

/** URL encoded in the QR code that the admin scans with their phone. */
export const buildApprovalScanUrl = (sessionId: string, email: string) =>
  buildPublicUrl(`/approve-fp/${encodeURIComponent(sessionId)}?e=${encodeURIComponent(email)}`);

export const base64ToBytes = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

export const bytesToBase64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export const describeDevice = () => {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : 'Phone';
  const model = ua.match(/\(([^)]+)\)/)?.[1]?.split(';').map((s) => s.trim()) || [];
  const label = model.find((m) => !/Linux|U;|wv|CPU|Mozilla|rv:/i.test(m) && m.length < 30);
  return label ? `${label} (${os})` : os;
};

/**
 * Runs the WebAuthn fingerprint check for the enrolled credential of `email`.
 * Throws with a friendly message when the device cannot complete it.
 */
export const runFingerprintCheck = async (credentialId: string) => {
  if (!window.isSecureContext) {
    throw new Error('Fingerprint approval needs a secure (https) connection.');
  }
  if (!window.PublicKeyCredential) {
    throw new Error('This device or browser does not support fingerprint approval.');
  }
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: base64ToBytes(credentialId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error('No fingerprint captured.');
  return bytesToBase64(assertion.rawId);
};

/** True when an approval item involves money and must be fingerprint-confirmed. */
export const requiresFingerprintApproval = (amount: unknown, type?: string) => {
  const value = typeof amount === 'number' ? amount : parseFloat(String(amount ?? '')) || 0;
  const t = String(type || '').toLowerCase();
  if (t.includes('leave')) return false;
  return value > 0;
};
