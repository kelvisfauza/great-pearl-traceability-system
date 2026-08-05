import { buildPublicUrl } from './publicUrl';

/**
 * Public URL that a GRN QR code points to.
 * Scanning opens the GRN inside the system so Finance can pay against it.
 */
export function getGrnScanUrl(grnNumber: string): string {
  return buildPublicUrl(`/grn/${encodeURIComponent(grnNumber)}`);
}

export function getGrnScanQrUrl(grnNumber: string, size: number = 110): string {
  const url = getGrnScanUrl(grnNumber);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=svg`;
}
