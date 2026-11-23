import { jsPDF } from 'jspdf';
import { createDocumentPrintStamp, reportPrintError } from '@/lib/documentPrintStamp';
import { addDepartmentStampPdf } from '@/utils/departmentStamps';
import { documentDepartmentStamp } from '@/lib/departmentStampRules';

const pending = new WeakMap<jsPDF, Promise<void>>();

/** Reserve space by uniformly fitting existing artwork above the footer, never covering signatures. */
export function fitPdfPageForFooter(width: number, height: number, footerHeight: number) {
  const scale = Math.max(0.1, (height - footerHeight) / height);
  return { scale, translateX: width * (1 - scale) / 2, translateY: footerHeight };
}

export function preparePdfPrint(doc: jsPDF, title = 'System document'): Promise<void> {
  const existing = pending.get(doc);
  if (existing) return existing;
  const promise = (async () => {
    const stamp = await createDocumentPrintStamp(title, 'pdf');
    const count = doc.getNumberOfPages();
    const current = (doc.internal as any).getCurrentPageInfo().pageNumber;
    const unit = doc.internal.scaleFactor;
    for (let page = 1; page <= count; page++) {
      doc.setPage(page);
      const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
      const footer = Math.min(56 * 72 / 25.4 / unit, h * 0.32);
      const fit = fitPdfPageForFooter(w * unit, h * unit, footer * unit);
      const commands = (doc.internal as any).pages[page] as string[];
      commands.unshift(`q ${fit.scale} 0 0 ${fit.scale} ${fit.translateX} ${fit.translateY} cm`);
      commands.push('Q');
      const pad = 8 * 72 / 25.4 / unit;
      const verificationHeight = Math.min(28 * 72 / 25.4 / unit, footer * 0.55);
      const size = verificationHeight * 0.78;
      const y = h - footer;
      const key = stamp.departmentStamp || documentDepartmentStamp(title);
      const stampWidth = 40 * 72 / 25.4 / unit;
      const artworkHeight = footer - verificationHeight;
      await addDepartmentStampPdf(doc, 'business', w - pad - stampWidth, y, stampWidth, artworkHeight, stamp.printedAt);
      if (key !== 'business') await addDepartmentStampPdf(doc, key, w - pad - stampWidth * 2 - pad, y, stampWidth, artworkHeight, stamp.printedAt);
      const verificationY = h - verificationHeight;
      doc.setDrawColor(100);
      doc.setLineWidth(0.3 / unit);
      doc.line(pad, verificationY + 2 / unit, w - pad, verificationY + 2 / unit);
      doc.setTextColor(30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(`Printed by: ${stamp.printedBy}`, w - 3 * pad - size);
      doc.text(lines, pad, verificationY + 13 / unit);
      doc.setFontSize(6.5);
      doc.text(`${new Date(stamp.printedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })} (Uganda)`, pad, verificationY + (13 + lines.length * 9) / unit);
      doc.text(stamp.code, pad, h - 12 / unit);
      doc.text(`Scan to verify issuance | Page ${page} of ${count}`, pad, h - 4 / unit);
      doc.addImage(stamp.qr, 'PNG', w - pad - size, verificationY + 4 / unit, size, size);
    }
    doc.setPage(current);
  })();
  pending.set(doc, promise);
  promise.catch(() => pending.delete(doc));
  return promise;
}

let installed = false;
/** jsPDF's instance methods are created in its constructor, so install at initialized, not API.save. */
export function installPdfPrintStamp() {
  if (installed) return;
  installed = true;
  jsPDF.API.events.push(['initialized', function (this: jsPDF) {
    const save = this.save.bind(this);
    this.save = ((filename?: string, options?: any) => {
      const result = preparePdfPrint(this, filename || 'System document').then(() => save(filename, options));
      result.catch(reportPrintError);
      return result;
    }) as typeof this.save;
  }]);
}