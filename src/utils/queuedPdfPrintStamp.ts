import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createDocumentPrintStamp } from '@/lib/documentPrintStamp';

/** Older PDFs and copies forwarded to a colleague need that colleague's print identity. */
export async function stampQueuedPdf(content: string, title: string): Promise<string> {
  const doc = await PDFDocument.load(content);
  const stamp = await createDocumentPrintStamp(title, 'pdf_reprint');
  const qr = await doc.embedPng(stamp.qr);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const footer = Math.min(80, height * 0.22);
    const scale = (height - footer) / height;
    page.scaleContent(scale, scale);
    page.translateContent(width * (1 - scale) / 2, footer);
    const name = `Printed by: ${stamp.printedBy}`.replace(/[^\x20-\x7e]/g, '?');
    const size = Math.min(8, (width - 110) / Math.max(font.widthOfTextAtSize(name, 1), 1));
    page.drawText(name, { x: 20, y: footer - 20, font, size, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(stamp.code, { x: 20, y: 24, font, size: 7 });
    page.drawText('Scan to verify document issuance', { x: 20, y: 12, font, size: 7 });
    page.drawImage(qr, { x: width - footer, y: 4, width: footer - 8, height: footer - 8 });
  }
  return doc.saveAsBase64({ dataUri: true });
}