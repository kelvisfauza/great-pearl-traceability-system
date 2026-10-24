import jsPDF from 'jspdf';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';
import logoUrl from '@/assets/great-agro-coffee-logo.png';

export interface FuelVoucherPayload {
  voucherNumber: string;
  kind: 'trip' | 'book';
  date: string; // ISO
  truckNumber?: string;
  driverName?: string;
  driverPhone?: string;
  serviceProvider?: string;
  fuelType?: string;
  route?: string;
  purpose?: string;
  notes?: string;
  issuedBy: string;
}

const COMPANY = {
  name: 'GREAT AGRO COFFEE',
  tagline: 'A Member of YEDA Coffee Company Limited',
  address: 'P.O Box 431420, Kasese, Uganda',
  phone: '+256 393 001 626',
  email: 'finance@greatpearlcoffee.com',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-UG', { day: '2-digit', month: 'long', year: 'numeric' });
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

const drawVoucherPage = async (doc: jsPDF, data: FuelVoucherPayload) => {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const boxW = pageW - margin * 2;
  const isBlank = data.kind === 'book';

  // Header band
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 90, 'F');
  try {
    const logo = await loadImageAsDataUrl(logoUrl);
    doc.addImage(logo, 'PNG', margin, 18, 54, 54);
  } catch {/* optional */}

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.name, margin + 70, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(COMPANY.tagline, margin + 70, 54);
  doc.setFontSize(8.5);
  doc.text(`${COMPANY.address}  •  ${COMPANY.phone}  •  ${COMPANY.email}`, margin + 70, 68);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FUEL VOUCHER', margin, 128);

  // Meta box
  const metaX = pageW - margin - 220;
  const metaY = 104;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(metaX, metaY, 220, 62, 4, 4, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('VOUCHER NO.', metaX + 10, metaY + 14);
  doc.text('DATE ISSUED', metaX + 10, metaY + 40);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text(data.voucherNumber, metaX + 10, metaY + 28);
  doc.setFontSize(10);
  doc.text(formatDate(data.date), metaX + 10, metaY + 54);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('TYPE', metaX + 130, metaY + 14);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.text(isBlank ? 'BLANK (BOOK)' : 'TRIP', metaX + 130, metaY + 28);

  let y = 190;

  // Intro
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const intro = isBlank
    ? 'This voucher authorises the bearer to draw fuel for a company vehicle. The service provider completes the details below; charges are settled per our agreed account terms.'
    : 'Please supply fuel to the company vehicle detailed below. Complete the usage section; charges are settled per our agreed account terms.';
  doc.text(doc.splitTextToSize(intro, boxW), margin, y);
  y += 30;

  // Vehicle / trip details box
  const colW = boxW / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, boxW, 130, 'S');
  doc.line(margin + colW, y, margin + colW, y + 130);

  const drawField = (label: string, value: string, x: number, fy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), x + 10, fy + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(value || '—', x + 10, fy + 30);
  };

  drawField('Truck / Vehicle No.', data.truckNumber || '', margin, y);
  drawField('Driver Name', data.driverName || '', margin + colW, y);
  drawField('Driver Phone', data.driverPhone || '', margin, y + 42);
  drawField('Fuel Type', data.fuelType || 'Diesel', margin + colW, y + 42);
  drawField('Route / Destination', data.route || '', margin, y + 84);
  drawField('Service Provider', data.serviceProvider || '', margin + colW, y + 84);

  y += 145;
  if (data.purpose) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('PURPOSE', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(data.purpose, boxW - 60);
    doc.text(lines, margin + 60, y);
    y += lines.length * 12 + 8;
  }

  // === Station fill-in section (open amount) ===
  y += 8;
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, boxW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TO BE COMPLETED BY SERVICE PROVIDER', margin + 10, y + 15);
  y += 22;

  const cols = [
    { label: 'FUEL / ITEM', w: 0.30 },
    { label: 'QTY (Litres)', w: 0.16 },
    { label: 'UNIT PRICE (UGX)', w: 0.22 },
    { label: 'AMOUNT (UGX)', w: 0.32 },
  ];
  const colWidths = cols.map(c => c.w * boxW);
  const headerH = 24;
  const rowH = 30;

  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, boxW, headerH, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, boxW, headerH, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  let cx = margin;
  cols.forEach((c, i) => {
    doc.text(c.label, cx + 6, y + 16);
    if (i < cols.length - 1) doc.line(cx + colWidths[i], y, cx + colWidths[i], y + headerH);
    cx += colWidths[i];
  });
  y += headerH;

  for (let r = 0; r < 3; r++) {
    doc.rect(margin, y, boxW, rowH, 'S');
    cx = margin;
    cols.forEach((c, i) => {
      if (i < cols.length - 1) doc.line(cx + colWidths[i], y, cx + colWidths[i], y + rowH);
      cx += colWidths[i];
    });
    y += rowH;
  }

  // TOTAL row
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, boxW, 30, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, boxW, 30, 'S');
  doc.line(margin + boxW * 0.68, y, margin + boxW * 0.68, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL AMOUNT OWED (UGX)', margin + boxW * 0.68 - 10, y + 19, { align: 'right' });
  y += 30;

  // Amount in words
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('AMOUNT IN WORDS', margin, y);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin + 110, y + 2, pageW - margin, y + 2);

  // Provider details / signatures
  y += 26;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('STATION / ATTENDANT NAME', margin, y);
  doc.text('SIGNATURE & STAMP', margin + boxW / 2, y);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y + 30, margin + boxW / 2 - 20, y + 30);
  doc.line(margin + boxW / 2, y + 30, pageW - margin - 10, y + 30);

  // Issued by
  y += 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('ISSUED BY', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(data.issuedBy || '—', margin, y + 18);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y + 34, margin + boxW / 2 - 20, y + 34);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Signature & Date', margin, y + 46);

  if (data.notes) {
    y += 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTES', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(data.notes, boxW), margin, y + 12);
  }

  // Footer
  const footY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, footY - 10, pageW - margin, footY - 10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${COMPANY.name} • This voucher is valid only with the verification QR and an unaltered total.`, pageW / 2, footY, { align: 'center' });
};

export const generateFuelVoucherPdf = async (vouchers: FuelVoucherPayload[]): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  for (let i = 0; i < vouchers.length; i++) {
    if (i > 0) doc.addPage();
    await drawVoucherPage(doc, vouchers[i]);
  }
  const title = vouchers.length === 1
    ? `Fuel voucher ${vouchers[0].voucherNumber}`
    : `Fuel voucher book (${vouchers.length} vouchers, ${vouchers[0].voucherNumber} – ${vouchers[vouchers.length - 1].voucherNumber})`;
  await preparePdfPrint(doc, title);
  return doc.output('blob');
};

export const openFuelVoucherPdf = async (vouchers: FuelVoucherPayload[]) => {
  const blob = await generateFuelVoucherPdf(vouchers);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => setTimeout(() => w.print(), 400);
  }
};
