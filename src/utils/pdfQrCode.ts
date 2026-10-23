import QRCode from 'qrcode';
import { createDocumentPrintStamp } from '@/lib/documentPrintStamp';
import { getVerificationUrl } from '@/utils/verificationCode';

export interface DocQr {
  code: string;
  url: string;
  dataUrl: string;
}

/** Builds a verification code + QR data URL that can be embedded in a jsPDF document. */
export async function buildDocumentQr(reference?: string): Promise<DocQr> {
  // A form number (e.g. quality analysis / store report) must stay scannable so the
  // form can be loaded back; the "Printed by" verification footer is added separately.
  if (reference) {
    const url = getVerificationUrl(reference);
    const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 4, errorCorrectionLevel: 'M' });
    return { code: reference, url, dataUrl };
  }
  const stamp = await createDocumentPrintStamp(reference || 'Document template', 'pdf_template');
  return { code: stamp.code, url: stamp.url, dataUrl: stamp.qr };
}

/** Draws a small QR block (image + code + caption) at the given position in a jsPDF doc. */
export function drawQrBlock(
  doc: any,
  qr: DocQr,
  x: number,
  y: number,
  size = 22,
  caption = 'Scan to verify document',
) {
  try { doc.addImage(qr.dataUrl, 'PNG', x, y, size, size); } catch { /* ignore */ }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(qr.code, x + size / 2, y + size + 3, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(90, 90, 90);
  doc.text(caption, x + size / 2, y + size + 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}
