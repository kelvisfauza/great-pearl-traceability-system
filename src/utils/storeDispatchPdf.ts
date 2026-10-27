import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from '@/utils/companyBrand';
import { dispatchDocumentTitles } from '@/lib/storeDispatchRules';

export async function printStoreDispatchPair(row: any) {
  // Open synchronously so issuing verification does not trigger a popup blocker.
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow pop-ups to print these documents');
  preview.document.title = 'Preparing clearance and delivery note';
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const titles = dispatchDocumentTitles(row);
    for (let page = 0; page < 2; page++) {
      if (page) doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text(COMPANY_NAME, 105, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(COMPANY_ADDRESS, 105, 24, { align: 'center' });
      doc.text(COMPANY_PHONES, 105, 29, { align: 'center' });
      doc.line(14, 39, 196, 39);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text(page === 0 ? 'STORE CLEARANCE / RELEASE FORM' : 'SALES DELIVERY NOTE', 105, 48, { align: 'center' });
      doc.setFontSize(10); doc.text(titles[page], 14, 57);
      autoTable(doc, {
        startY: 62, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 },
        body: [
          ['Clearance No.', row.form_number, 'Delivery Note No.', row.delivery_note_number],
          ['Date', row.clearance_date, 'Warehouse', row.warehouse || ''],
          ['Destination / Buyer', row.destination_buyer || '', 'Vehicle', row.vehicle_registration || ''],
          ['Driver', row.driver_name || '', 'Driver Telephone', row.driver_phone || ''],
        ],
      });
      const y = (doc as any).lastAutoTable.finalY + 6;
      autoTable(doc, { startY: y, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 },
        head: [['No.', 'Lot / Batch', 'Coffee Type', 'Bags', 'Weight (kg)']],
        body: (row.items || []).map((item: any, index: number) => [index + 1, item.lot_ref || '', item.coffee_type, item.bags, Number(item.weight_kg).toLocaleString()]),
        foot: [['', '', 'TOTAL', row.total_bags, Number(row.total_weight_kg).toLocaleString()]],
      });
      let end = (doc as any).lastAutoTable.finalY + 9;
      const remarks = doc.splitTextToSize(`Remarks: ${row.remarks || ''}`, 180);
      if (end + remarks.length * 5 + 35 > 260) { doc.addPage(); end = 20; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(remarks, 14, end);
      end += remarks.length * 5 + 14;
      const signatures = page === 0
        ? [['Released by', row.released_by], ['Driver received', row.received_by_driver], ['Administrator approval', row.approved_by]]
        : [['Dispatched by', row.released_by], ['Driver signature', row.received_by_driver], ['Buyer received by', '']];
      signatures.forEach(([label, name], index) => {
        const x = 14 + index * 62; doc.line(x, end + 7, x + 55, end + 7);
        doc.text(doc.splitTextToSize(`${label}: ${name || ''}`, 55), x, end + 13);
      });
    }
    await preparePdfPrint(doc, titles.join(' / '));
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    preview.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (error) {
    preview.close(); throw error;
  }
}