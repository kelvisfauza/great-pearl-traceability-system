import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createDocumentPrintStamp } from '@/lib/documentPrintStamp';
import { datedDepartmentStamp } from '@/utils/departmentStamps';
import { documentDepartmentStamp } from '@/lib/departmentStampRules';

/** Older PDFs and copies forwarded to a colleague need that colleague's print identity. */
export async function stampQueuedPdf(content: string, title: string): Promise<string> {
  const doc = await PDFDocument.load(content);
  const stamp = await createDocumentPrintStamp(title, 'pdf_reprint');
  const qr = await doc.embedPng(stamp.qr);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const key = stamp.departmentStamp || documentDepartmentStamp(title);
  const keys = key === 'business' ? ['business'] as const : [key, 'business'] as const;
  const artwork = await Promise.all(keys.map(async key => doc.embedPng(await datedDepartmentStamp(key, stamp.printedAt))));
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const footer = Math.min(150, height * 0.32);
    const verificationHeight = Math.min(80, footer * 0.55);
    const scale = (height - footer) / height;
    page.scaleContent(scale, scale);
    page.translateContent(width * (1 - scale) / 2, footer);
    const name = `Printed by: ${stamp.printedBy}`.replace(/[^\x20-\x7e]/g, '?');
    const size = Math.min(8, (width - 110) / Math.max(font.widthOfTextAtSize(name, 1), 1));
    page.drawText(name, { x: 20, y: verificationHeight - 20, font, size, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(new Date(stamp.printedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' }) + ' (Uganda)', { x: 20, y: 38, font, size: 7 });
    artwork.forEach((image, index) => {
      const scale = Math.min(105 / image.width, (footer - verificationHeight - 4) / image.height);
      const drawWidth = image.width * scale, drawHeight = image.height * scale;
      page.drawImage(image, { x: width - 20 - (artwork.length - index) * 115 + (105 - drawWidth) / 2, y: verificationHeight + 4, width: drawWidth, height: drawHeight });
    });
    page.drawText(stamp.code, { x: 20, y: 24, font, size: 7 });
    page.drawText('Scan to verify document issuance', { x: 20, y: 12, font, size: 7 });
    page.drawImage(qr, { x: width - verificationHeight, y: 4, width: verificationHeight - 8, height: verificationHeight - 8 });
  }
  return doc.saveAsBase64({ dataUri: true });
}