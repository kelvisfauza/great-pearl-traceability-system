import { buildPublicUrl } from './publicUrl';

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
