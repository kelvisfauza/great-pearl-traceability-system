import jsPDF from 'jspdf';
import logoUrl from '@/assets/great-agro-coffee-logo.png';

export interface FuelOrderPayload {
  orderNumber: string;
  reference?: string;
  date: string;            // ISO
  serviceProvider: string; // e.g. "Shell Kasese"
  providerAddress?: string;
  truckNumber: string;
  driverName: string;
  driverPhone?: string;
  fuelType: 'Diesel' | 'Petrol' | 'Other';
  requestedVolume?: string;     // "200 Litres" or "Full Tank"
  fullTank: boolean;
  destination?: string;
  purpose?: string;
  requestedBy: string;
  requestedByTitle?: string;
  authorisedBy: string;
  authorisedByTitle?: string;
  notes?: string;
}

const COMPANY = {
  name: 'GREAT PEARL COFFEE COMPANY',
  tagline: 'Finance Department • Fuel / Service Order',
  address: 'Kasese, Uganda',
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

export const buildFuelOrderNumber = (): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FO-${stamp}-${rand}`;
};

export const generateFuelOrderPdf = async (data: FuelOrderPayload): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

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
  doc.setFontSize(20);
  doc.text('FUEL / SERVICE ORDER', margin, 125);

  // Meta box
  const metaX = pageW - margin - 220;
  const metaY = 105;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(metaX, metaY, 220, 60, 4, 4, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('ORDER NO.', metaX + 10, metaY + 14);
  doc.text('DATE', metaX + 10, metaY + 36);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(data.orderNumber, metaX + 10, metaY + 26);
  doc.setFontSize(10);
  doc.text(formatDate(data.date), metaX + 10, metaY + 50);
  if (data.reference) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('REFERENCE', metaX + 120, metaY + 14);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.text(data.reference, metaX + 120, metaY + 26);
  }

  let y = 185;

  // Service provider block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('TO (SERVICE PROVIDER)', margin, y);
  y += 14;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text(data.serviceProvider || '—', margin, y);
  if (data.providerAddress) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(data.providerAddress, margin, y);
  }

  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const intro = `Please supply the fuel/service detailed below to our authorised driver. Charges will be settled per our agreed account terms.`;
  doc.text(doc.splitTextToSize(intro, pageW - margin * 2), margin, y);
  y += 28;

  // Order details box
  const boxX = margin;
  const boxW = pageW - margin * 2;
  const colW = boxW / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(boxX, y, boxW, 130, 'S');
  doc.line(boxX + colW, y, boxX + colW, y + 130);

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

  drawField('Truck / Vehicle No.', data.truckNumber, boxX, y);
  drawField('Driver Name', data.driverName, boxX + colW, y);
  drawField('Driver Phone', data.driverPhone || '—', boxX, y + 42);
  drawField('Fuel Type', data.fuelType, boxX + colW, y + 42);
  drawField('Volume Requested', data.fullTank ? 'FULL TANK' : (data.requestedVolume || '—'), boxX, y + 84);
  drawField('Destination / Route', data.destination || '—', boxX + colW, y + 84);

  y += 145;
  if (data.purpose) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('PURPOSE', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(data.purpose, pageW - margin * 2 - 60);
    doc.text(lines, margin + 60, y);
    y += lines.length * 12 + 8;
  }

  // === Service Provider Fill-in Section ===
  y += 8;
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, boxW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TO BE COMPLETED BY SERVICE PROVIDER', margin + 10, y + 15);
  y += 22;

  // Table
  const tableW = boxW;
  const cols = [
    { label: 'ITEM / FUEL', w: 0.30 },
    { label: 'QTY (Litres)', w: 0.16 },
    { label: 'UNIT PRICE (UGX)', w: 0.22 },
    { label: 'AMOUNT (UGX)', w: 0.32 },
  ];
  const colWidths = cols.map(c => c.w * tableW);
  const headerH = 24;
  const rowH = 28;

  // header
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, tableW, headerH, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, tableW, headerH, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  let cx = margin;
  cols.forEach((c, i) => {
    doc.text(c.label, cx + 6, y + 16);
    if (i < cols.length - 1) {
      doc.line(cx + colWidths[i], y, cx + colWidths[i], y + headerH);
    }
    cx += colWidths[i];
  });
  y += headerH;

  // 3 empty rows for fill-in
  for (let r = 0; r < 3; r++) {
    doc.rect(margin, y, tableW, rowH, 'S');
    cx = margin;
    cols.forEach((c, i) => {
      if (i < cols.length - 1) {
        doc.line(cx + colWidths[i], y, cx + colWidths[i], y + rowH);
      }
      cx += colWidths[i];
    });
    y += rowH;
  }

  // Sub-total / Other charges / TOTAL OWED rows
  const summary = [
    'SUB-TOTAL (UGX)',
    'OTHER CHARGES (UGX)',
    'TOTAL AMOUNT OWED (UGX)',
  ];
  summary.forEach((label, i) => {
    const h = i === summary.length - 1 ? 30 : 24;
    if (i === summary.length - 1) {
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, y, tableW, h, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, tableW, h, 'F');
      doc.setTextColor(20, 20, 20);
    }
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, y, tableW, h, 'S');
    doc.line(margin + tableW * 0.68, y, margin + tableW * 0.68, y + h);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(i === summary.length - 1 ? 11 : 10);
    doc.text(label, margin + tableW * 0.68 - 10, y + (h / 2) + 4, { align: 'right' });
    y += h;
  });

  // Provider details / signatures
  y += 18;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("PUMP ATTENDANT / CASHIER NAME", margin, y);
  doc.text('SIGNATURE & STAMP', margin + boxW / 2, y);
  y += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 30, margin + boxW / 2 - 20, y + 30);
  doc.line(margin + boxW / 2, y + 30, margin + boxW - 10, y + 30);

  // Authorisation block
  y += 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('REQUESTED BY', margin, y);
  doc.text('AUTHORISED BY', margin + boxW / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(data.requestedBy || '—', margin, y + 18);
  doc.text(data.authorisedBy || '—', margin + boxW / 2, y + 18);
  if (data.requestedByTitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(data.requestedByTitle, margin, y + 32);
  }
  if (data.authorisedByTitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(data.authorisedByTitle, margin + boxW / 2, y + 32);
  }
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y + 48, margin + boxW / 2 - 20, y + 48);
  doc.line(margin + boxW / 2, y + 48, margin + boxW - 10, y + 48);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Signature & Date', margin, y + 60);
  doc.text('Signature & Date', margin + boxW / 2, y + 60);

  if (data.notes) {
    y += 80;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(data.notes, pageW - margin * 2), margin, y + 12);
  }

  // Footer
  const footY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, footY - 10, pageW - margin, footY - 10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${COMPANY.name} • This document is computer generated and valid without alteration.`, pageW / 2, footY, { align: 'center' });

  return doc.output('blob');
};

export const openFuelOrderPdf = async (data: FuelOrderPayload) => {
  const blob = await generateFuelOrderPdf(data);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => setTimeout(() => w.print(), 400);
  }
};