import { buildPublicUrl } from './publicUrl';
import QRCode from 'qrcode';

/**
 * Public URL that a GRN QR code points to.
 * Prefer the secure random pay code (typo-proof) and fall back to the batch number
 * for legacy documents that were printed before pay codes existed.
 */
export function getGrnScanUrl(grnNumber: string, payCode?: string | null): string {
  const ref = payCode || grnNumber;
  return buildPublicUrl(`/grn/${encodeURIComponent(ref)}`);
}

export function getGrnScanQrUrl(grnNumber: string, size: number = 110, payCode?: string | null): string {
  const url = getGrnScanUrl(grnNumber, payCode);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=svg`;
}

const qrCache = new Map<string, string>();

/**
 * Offline-safe QR image for a GRN. Renders locally to a data URL so every
 * printed GRN carries a scannable code even when the external QR service or
 * the network is unavailable.
 */
export async function getGrnScanQrDataUrl(
  grnNumber: string,
  size: number = 220,
  payCode?: string | null,
): Promise<string> {
  const url = getGrnScanUrl(grnNumber, payCode);
  const key = `${url}|${size}`;
  const cached = qrCache.get(key);
  if (cached) return cached;
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    qrCache.set(key, dataUrl);
    return dataUrl;
  } catch (e) {
    console.error('Local QR generation failed, falling back to remote', e);
    return getGrnScanQrUrl(grnNumber, size, payCode);
  }
}
