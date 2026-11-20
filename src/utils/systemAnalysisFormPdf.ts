import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from '@/utils/companyBrand';

const pct = (v: any) => (v === null || v === undefined || v === '' ? '' : `${Number(v)}%`);
const num = (v: any) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString());

/** Form number is derived from the delivery batch so every delivery has exactly one system analysis form. */
export const systemAnalysisFormNumber = (batch: string) => `GAC SQA-${batch}`;

/** Prints the system-generated quality analysis form from a saved assessment (and its delivery). */
export async function printSystemAnalysisForm(a: any, delivery?: any, reserved?: Window | null) {
  const preview = reserved ?? window.open('', '_blank');
  if (!preview) throw new Error('Allow pop-ups to print the analysis form');
  preview.document.title = 'Preparing analysis form';
  try {
    const batch = a.batch_number || delivery?.batch_number || '';
    const formNo = systemAnalysisFormNumber(batch);
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(COMPANY_NAME, 105, 18, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(COMPANY_ADDRESS, 105, 24, { align: 'center' });
    doc.text(COMPANY_PHONES, 105, 29, { align: 'center' });
    doc.line(14, 34, 196, 34);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('QUALITY ANALYSIS FORM', 105, 43, { align: 'center' });
    doc.setFontSize(10); doc.text(`No. ${formNo}`, 196, 43, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('System-generated from the saved quality assessment', 105, 48, { align: 'center' });
    autoTable(doc, {
      startY: 53, theme: 'grid', styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 2: { fontStyle: 'bold', cellWidth: 38 } },
      body: [
        ['Supplier', a.supplier_name || delivery?.supplier_name || '', 'Delivery No.', batch],
        ['Coffee Type', a.coffee_type || delivery?.coffee_type || '', 'Delivery Date', delivery?.date || ''],
        ['Weight', delivery?.kilograms ? `${num(delivery.kilograms)} kg` : '', 'Bags', num(delivery?.bags)],
        ['Date Assessed', a.date_assessed || '', 'Status', String(a.status || '')],
      ],
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6, theme: 'grid', styles: { fontSize: 10, cellPadding: 3 },
      head: [['Parameter', 'Result', 'Parameter', 'Result']],
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
      body: [
        ['Moisture', pct(a.moisture), 'Group 1 defects', pct(a.group1_defects)],
        ['Group 2 defects', pct(a.group2_defects), 'Below screen 12', pct(a.below12)],
        ['Pods', pct(a.pods), 'Husks', pct(a.husks)],
        ['Stones', pct(a.stones), 'Foreign matter', pct(a.fm)],
        ['Clean D14', pct(a.clean_d14), 'Outturn', pct(a.outturn)],
      ],
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6, theme: 'grid', styles: { fontSize: 12, cellPadding: 4, halign: 'center' },
      head: [['Suggested price / kg', 'FINAL PRICE / kg']],
      body: [[a.suggested_price ? `UGX ${num(a.suggested_price)}` : '', a.final_price ? `UGX ${num(a.final_price)}` : '']],
      bodyStyles: { fontStyle: 'bold' },
    });
    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    const note = doc.splitTextToSize(`Quality note / comments: ${[a.quality_note, a.comments].filter(Boolean).join(' — ')}`, 180);
    doc.text(note, 14, y);
    y += note.length * 5 + 18;
    [['Physical analysis by', a.physical_assessment_by], ['System entry by', a.system_assessment_by || a.assessed_by]].forEach(([label, name], i) => {
      const x = 14 + i * 95; doc.line(x, y, x + 80, y);
      doc.text(`${label}: ${name || ''}`, x, y + 6);
    });
    await preparePdfPrint(doc, `Quality analysis form ${formNo}`);
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    preview.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (e) { preview.close(); throw e; }
}
