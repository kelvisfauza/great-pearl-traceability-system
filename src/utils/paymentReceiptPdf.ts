import jsPDF from 'jspdf';
import logoUrl from '@/assets/great-agro-coffee-logo.png';
import signatureUrl from '@/assets/mukobi-godwin-signature.png';

export interface ReceiptPayload {
  reference: string;             // RCP-xxxxxxxx
  paymentType: 'service-provider' | 'meal' | 'general';
  paidTo: {
    name: string;
    phone: string;
    email?: string;
  };
  description: string;
  invoiceNumber?: string;
  amount: number;          // base amount (UGX)
  charges: number;         // mobile money / withdrawal charges
  total: number;           // grand total
  paymentMethod: string;   // e.g. "Mobile Money (MTN)"
  transactionId?: string;
  paidOn: string;          // ISO date
  processedBy: string;     // staff name
  processedByEmail?: string;
  notes?: string;
}

const COMPANY = {
  name: 'GREAT PEARL COFFEE COMPANY',
  tagline: 'Finance Department • Official Payment Receipt',
  address: 'Kasese, Uganda',
  phone: '+256 393 001 626',
  email: 'finance@greatpearlcoffee.com',
  website: 'www.greatpearlcoffee.com',
};

const FINANCE_MANAGER = {
  name: 'Mukobi Godwin',
  title: 'Finance Manager',
};

const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-UG', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const loadImageAsDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const buildReceiptReference = (prefix = 'RCP'): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
};

export const generatePaymentReceiptPdf = async (data: ReceiptPayload): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ---- Watermark "PAID" ----
  doc.saveGraphicsState();
  // @ts-ignore - jspdf supports GState
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(140);
  doc.setTextColor(34, 139, 34);
  doc.text('PAID', pageW / 2, pageH / 2 + 40, { align: 'center', angle: 25 });
  doc.restoreGraphicsState();

  // ---- Header band ----
  doc.setFillColor(28, 80, 50); // deep coffee green
  doc.rect(0, 0, pageW, 90, 'F');

  try {
    const logo = await loadImageAsDataUrl(logoUrl);
    doc.addImage(logo, 'PNG', margin, 18, 54, 54);
  } catch {/* logo optional */}

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.name, margin + 70, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(COMPANY.tagline, margin + 70, 54);
  doc.setFontSize(8.5);
  doc.text(`${COMPANY.address}  •  ${COMPANY.phone}  •  ${COMPANY.email}`, margin + 70, 68);

  // ---- Title bar ----
  doc.setTextColor(28, 80, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('PAYMENT RECEIPT', margin, 125);

  // Receipt meta box (top-right)
  const metaX = pageW - margin - 200;
  const metaY = 105;
  doc.setDrawColor(28, 80, 50);
  doc.setLineWidth(0.6);
  doc.roundedRect(metaX, metaY, 200, 60, 4, 4, 'S');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT NO.', metaX + 10, metaY + 14);
  doc.text('DATE', metaX + 10, metaY + 36);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(data.reference, metaX + 10, metaY + 26);
  doc.setFontSize(9.5);
  doc.text(formatDate(data.paidOn), metaX + 10, metaY + 50);

  // ---- Status pill ----
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, 135, 70, 20, 10, 10, 'F');
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAID', margin + 35, 149, { align: 'center' });

  // ---- Payee block ----
  let cursorY = 195;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('RECEIVED FROM (PAID TO)', margin, cursorY);
  cursorY += 14;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text(data.paidTo.name || '—', margin, cursorY);
  cursorY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Phone: ${data.paidTo.phone || '—'}`, margin, cursorY);
  if (data.paidTo.email) {
    cursorY += 12;
    doc.text(`Email: ${data.paidTo.email}`, margin, cursorY);
  }

  // ---- Description ----
  cursorY += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('PAYMENT DESCRIPTION', margin, cursorY);
  cursorY += 14;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(data.description || '—', pageW - margin * 2);
  doc.text(descLines, margin, cursorY);
  cursorY += descLines.length * 14 + 4;
  if (data.invoiceNumber) {
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference Invoice: ${data.invoiceNumber}`, margin, cursorY);
    cursorY += 14;
  }

  // ---- Amount table ----
  cursorY += 14;
  const tableX = margin;
  const tableW = pageW - margin * 2;
  const rowH = 26;

  const rows: [string, string][] = [
    ['Amount', formatUGX(data.amount)],
  ];
  if (data.charges > 0) rows.push(['Mobile Money / Withdrawal Charges', formatUGX(data.charges)]);

  // Header
  doc.setFillColor(28, 80, 50);
  doc.rect(tableX, cursorY, tableW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DESCRIPTION', tableX + 12, cursorY + 17);
  doc.text('AMOUNT (UGX)', tableX + tableW - 12, cursorY + 17, { align: 'right' });
  cursorY += rowH;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 247);
      doc.rect(tableX, cursorY, tableW, rowH, 'F');
    }
    doc.text(r[0], tableX + 12, cursorY + 17);
    doc.text(r[1], tableX + tableW - 12, cursorY + 17, { align: 'right' });
    cursorY += rowH;
  });

  // Total row
  doc.setFillColor(28, 80, 50);
  doc.rect(tableX, cursorY, tableW, rowH + 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL PAID', tableX + 12, cursorY + 19);
  doc.text(formatUGX(data.total), tableX + tableW - 12, cursorY + 19, { align: 'right' });
  cursorY += rowH + 18;

  // ---- Payment details ----
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT METHOD', margin, cursorY);
  doc.text('TRANSACTION REFERENCE', margin + 220, cursorY);
  doc.text('PROCESSED BY', pageW - margin - 130, cursorY);
  cursorY += 13;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.text(data.paymentMethod, margin, cursorY);
  doc.text(data.transactionId || '—', margin + 220, cursorY);
  const procLines = doc.splitTextToSize(data.processedBy || '—', 130);
  doc.text(procLines, pageW - margin - 130, cursorY);
  cursorY += 22;

  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', margin, cursorY);
    cursorY += 13;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(noteLines, margin, cursorY);
    cursorY += noteLines.length * 12 + 6;
  }

  // ---- Authorisation block (signature) ----
  const sigBoxY = pageH - 200;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, sigBoxY - 10, pageW - margin, sigBoxY - 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 80, 50);
  doc.text('AUTHORISED & DIGITALLY SIGNED', margin, sigBoxY + 6);

  // Signature image
  try {
    const sig = await loadImageAsDataUrl(signatureUrl);
    doc.addImage(sig, 'PNG', margin, sigBoxY + 14, 130, 60);
  } catch {/* signature optional */}

  // Underline & name
  doc.setDrawColor(40, 40, 40);
  doc.line(margin, sigBoxY + 80, margin + 200, sigBoxY + 80);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(FINANCE_MANAGER.name, margin, sigBoxY + 94);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`${FINANCE_MANAGER.title} • Great Pearl Coffee Company`, margin, sigBoxY + 107);
  doc.text(`Signed digitally on ${formatDate(new Date().toISOString())}`, margin, sigBoxY + 119);

  // Validation note (right side)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  const validLines = doc.splitTextToSize(
    `This is a system-generated receipt. Verify authenticity by quoting reference ${data.reference} to ${COMPANY.email}.`,
    220,
  );
  doc.text(validLines, pageW - margin - 220, sigBoxY + 94);

  // ---- Footer ----
  doc.setDrawColor(28, 80, 50);
  doc.setLineWidth(1);
  doc.line(margin, pageH - 50, pageW - margin, pageH - 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`${COMPANY.name}  •  ${COMPANY.address}  •  ${COMPANY.phone}  •  ${COMPANY.website}`, pageW / 2, pageH - 35, { align: 'center' });
  doc.text('Thank you for doing business with us.', pageW / 2, pageH - 22, { align: 'center' });

  return doc.output('blob');
};