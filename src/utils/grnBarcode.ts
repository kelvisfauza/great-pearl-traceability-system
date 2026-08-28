import JsBarcode from 'jsbarcode';
import { formatPayCode, normalizePayCode } from './grnPayCode';

const cache = new Map<string, string>();

/**
 * Text encoded in the GRN / Payment Order barcode. We use the human-readable
 * pay code (GAC-K7Q-M4X-T9) so a scanned barcode, a scanned QR and a typed code
 * all resolve through the exact same path. Falls back to the batch number for
 * legacy GRNs that have no pay code.
 */
export function getGrnBarcodeValue(grnNumber: string, payCode?: string | null): string {
  const clean = normalizePayCode(payCode || '');
  if (clean.length === 9) return formatPayCode(clean);
  return (grnNumber || '').trim();
}

/**
 * Renders a Code 128 barcode locally as a PNG data URL so printing never
 * depends on the network. Returns an empty string if rendering fails.
 */
export function getGrnBarcodeDataUrl(
  grnNumber: string,
  payCode?: string | null,
  opts?: { width?: number; height?: number },
): string {
  const value = getGrnBarcodeValue(grnNumber, payCode);
  if (!value) return '';
  const key = `${value}|${opts?.width || 2}|${opts?.height || 46}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: opts?.width ?? 2,
      height: opts?.height ?? 46,
      displayValue: true,
      fontSize: 13,
      textMargin: 1,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const dataUrl = canvas.toDataURL('image/png');
    cache.set(key, dataUrl);
    return dataUrl;
  } catch (e) {
    console.error('GRN barcode generation failed', e);
    return '';
  }
}
