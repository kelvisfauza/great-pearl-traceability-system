import jsPDF from 'jspdf';

export type ReleaseReceiptData = {
  reference: string;
  title: string;
  amount: number;
  recipientName?: string;
  phone?: string;
  channel: 'yo' | 'gosente' | 'cash' | 'bank' | string;
  releasedBy: string;
  requestId: string;
  approvals?: { label: string; by?: string | null; at?: string | null }[];
};

const channelLabel = (c: string) =>
  ({ yo: 'Yo Payments (Mobile Money)', gosente: 'GosentePay (Mobile Money)', cash: 'Cash', bank: 'Bank Transfer' } as Record<string, string>)[c] || c;

/** Builds the Finance payment-release receipt as a PDF (returns jsPDF doc). */
export function buildReleaseReceiptPdf(d: ReleaseReceiptData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GREAT AGRO COFFEE', w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('A member of Hello YEDA Coffee Company Limited', w / 2, y, { align: 'center' });
  y += 4;
  doc.text('P.O Box 431420, Kasese, Uganda', w / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PAYMENT RELEASE RECEIPT', w / 2, y, { align: 'center' });
  y += 3;
  doc.line(10, y, w - 10, y);
  y += 7;

  const row = (k: string, v: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(k, 12, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(v || '-', w - 60);
    doc.text(lines, 50, y);
    y += 5.5 * lines.length;
  };
  row('Receipt Ref:', d.reference);
  row('Date:', new Date().toLocaleString('en-GB'));
  row('Request:', d.title);
  row('Request ID:', d.requestId.slice(0, 8).toUpperCase());
  row('Paid to:', d.recipientName || '-');
  if (d.phone) row('Phone:', d.phone);
  row('Channel:', channelLabel(d.channel));
  y += 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(`UGX ${Number(d.amount).toLocaleString()}`, w / 2, y, { align: 'center' });
  y += 8;

  if (d.approvals?.length) {
    doc.setFontSize(9); doc.text('Approval trail', 12, y); y += 5;
    doc.setFont('helvetica', 'normal');
    d.approvals.filter(a => a.by).forEach(a => {
      doc.text(`${a.label}: ${a.by}${a.at ? ' - ' + new Date(a.at).toLocaleString('en-GB') : ''}`, 14, y);
      y += 5;
    });
  }
  row('Released by (Finance):', d.releasedBy);
  y += 12;
  doc.line(12, y, 62, y); doc.line(w - 62, y, w - 12, y);
  y += 4; doc.setFontSize(8);
  doc.text('Finance signature', 12, y); doc.text('Recipient signature', w - 62, y);
  return doc;
}
