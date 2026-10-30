import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from '@/utils/companyBrand';

export const WEIGHING_TICKET_COPIES = ['STORE COPY', 'FINANCE COPY', 'EUDR COPY'] as const;

const kg = (v: any) => `${Number(v || 0).toLocaleString()} kg`;

/** Prints three copies (Store, Finance, EUDR) of a saved weighing ticket, each page with the verification footer and QR. */
export async function printWeighingTicket(row: any, clearanceNumber?: string | null) {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow pop-ups to print the weighing ticket');
  preview.document.title = 'Preparing weighing ticket';
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const when = new Date(row.weighed_at);
    WEIGHING_TICKET_COPIES.forEach((copy, page) => {
      if (page) doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text(COMPANY_NAME, 105, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(COMPANY_ADDRESS, 105, 24, { align: 'center' });
      doc.text(COMPANY_PHONES, 105, 29, { align: 'center' });
      doc.line(14, 34, 196, 34);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('SALES WEIGHING TICKET', 105, 43, { align: 'center' });
      doc.setFontSize(10); doc.text(copy, 196, 43, { align: 'right' });
      autoTable(doc, {
        startY: 50, theme: 'grid', styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 2: { fontStyle: 'bold', cellWidth: 40 } },
        body: [
          ['Ticket No.', row.ticket_number, 'Clearance No.', clearanceNumber || ''],
          ['Date', when.toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala' }), 'Time', when.toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala', hour: '2-digit', minute: '2-digit' })],
          ['Sold to (Buyer)', row.buyer_name, 'Coffee Type', row.coffee_type],
          ['Vehicle', row.vehicle_registration || '', 'Driver', row.driver_name || ''],
        ],
      });
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6, theme: 'grid', styles: { fontSize: 12, cellPadding: 4, halign: 'center' },
        head: [['Bags', 'Gross Weight', 'Tare Weight', 'NET WEIGHT']],
        body: [[String(row.bags), kg(row.gross_weight_kg), kg(row.tare_weight_kg), kg(row.net_weight_kg)]],
        bodyStyles: { fontStyle: 'bold' },
      });
      let y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const remarks = doc.splitTextToSize(`Remarks: ${row.remarks || ''}`, 180);
      doc.text(remarks, 14, y);
      y += remarks.length * 5 + 20;
      [['Released by', row.released_by], ['Approved by', row.approved_by], ['Driver / Buyer', row.driver_name]].forEach(([label, name], i) => {
        const x = 14 + i * 62; doc.line(x, y, x + 55, y);
        doc.text(doc.splitTextToSize(`${label}: ${name || ''}`, 55), x, y + 6);
      });
    });
    await preparePdfPrint(doc, `Weighing ticket ${row.ticket_number}`);
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    preview.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (error) {
    preview.close(); throw error;
  }
}
