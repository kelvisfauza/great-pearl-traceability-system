import { createDocumentPrintStamp } from '@/lib/documentPrintStamp';

export interface DocQr {
  code: string;
  url: string;
  dataUrl: string;
}

/** Builds a verification code + QR data URL that can be embedded in a jsPDF document. */
export async function buildDocumentQr(reference?: string): Promise<DocQr> {
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
