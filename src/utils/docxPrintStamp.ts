import { Paragraph, TextRun, ImageRun, AlignmentType } from 'docx';
import { createDocumentPrintStamp } from '@/lib/documentPrintStamp';

export async function createDocxPrintFooter(title: string): Promise<Paragraph[]> {
  const stamp = await createDocumentPrintStamp(title, 'docx');
  const bytes = Uint8Array.from(atob(stamp.qr.split(',')[1]), char => char.charCodeAt(0));
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 }, children: [
      new TextRun({ text: `Printed by: ${stamp.printedBy} | ${new Date(stamp.printedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })} (Uganda)`, size: 16 }),
    ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: bytes, type: 'png', transformation: { width: 64, height: 64 } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${stamp.code} | Scan to verify template issuance, not subsequent edits`, size: 14 })] }),
  ];
}