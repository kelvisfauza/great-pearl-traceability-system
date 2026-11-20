import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { labRows, type LabPosting } from '@/lib/qualityLabReport';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from '@/utils/companyBrand';

export async function printOutlookLabReports(postings: LabPosting[], delivery: any, reserved: Window) {
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    for (const [index, p] of postings.entries()) {
      if (index) doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text(COMPANY_NAME, 105, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(COMPANY_ADDRESS, 105, 25, { align: 'center' });
      doc.text(COMPANY_PHONES, 105, 30, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('LAB QUALITY REPORT', 105, 43, { align: 'center' });
      autoTable(doc, { startY: 50, theme: 'grid', styles: { fontSize: 10 }, body: [
        ['Report', `GAC LAB-${p.id}`, 'Source form', p.form_number || '—'],
        ['Supplier', delivery?.supplier_name || p.supplier_name || '—', 'Delivery', delivery?.batch_number || '—'],
        ['Delivery date', delivery?.date || '—', 'Weight', delivery?.kilograms != null ? `${delivery.kilograms} kg` : '—'],
        ['Analysis date', p.analysis_date || '—', 'Posted by', p.sender_name || p.sender_email || '—'],
        ['Analyst', String(p.lab_results?.physical_assessment_by || '—'), 'Review', 'Reviewed'],
      ] });
      autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, theme: 'grid', head: [['Lab parameter', 'Result']], body: labRows(p), styles: { fontSize: 11 } });
      const comments = String(p.lab_results?.comments || '');
      if (comments) autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, theme: 'plain', body: [['Lab comments', comments]], styles: { fontSize: 9 } });
    }
    await preparePdfPrint(doc, `Lab quality report ${postings.map(p => p.form_number || p.id).join(', ')}`);
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob')); reserved.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (error) { reserved.close(); throw error; }
}