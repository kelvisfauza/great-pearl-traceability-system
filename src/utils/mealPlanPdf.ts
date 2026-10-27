import { jsPDF } from 'jspdf';
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_REG } from '@/utils/companyBrand';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';

export function drawMealPlanTemplate(number: string, existing?: jsPDF) {
  const doc = existing ?? new jsPDF({ format: 'a4', unit: 'mm' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(COMPANY_NAME, 105, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(COMPANY_TAGLINE, 105, 25, { align: 'center' });
  doc.text(COMPANY_ADDRESS, 105, 31, { align: 'center' });
  doc.text(COMPANY_REG, 105, 37, { align: 'center' });
  doc.line(16, 42, 194, 42);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('MEAL PLAN REQUISITION', 105, 51, { align: 'center' });
  doc.setFontSize(11); doc.text(`Document No: ${number}`, 16, 61);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const line = (label: string, y: number) => { doc.text(label, 16, y); doc.line(72, y + 1, 194, y + 1); };
  line('Date / meal period:', 73); line('Requested by / department:', 85);
  line('Recipient name:', 97); line('Phone / mobile money no:', 109);
  line('Email (optional):', 121);
  doc.text('Payment:   [  ] Cash     [  ] Mobile Money', 16, 133);
  doc.text('Item / purpose', 19, 147); doc.text('Quantity', 113, 147); doc.text('Amount (UGX)', 151, 147);
  for (let row = 0; row <= 6; row++) doc.line(16, 151 + row * 10, 194, 151 + row * 10);
  for (const x of [16, 106, 141, 194]) doc.line(x, 140, x, 211);
  doc.line(16, 140, 194, 140);
  line('TOTAL (UGX):', 224); line('Amount in words:', 236);
  doc.setFontSize(9);
  doc.text('Requested by: __________________    Procurement: __________________', 16, 252);
  doc.text('Admin approval: __________________    Finance / received by: __________', 16, 265);
  return doc;
}
export async function downloadMealPlanTemplate(number: string) {
  const doc = drawMealPlanTemplate(number);
  await preparePdfPrint(doc, `Meal plan requisition ${number}`);
  doc.save(`Meal-plan-${number}.pdf`);
}
export async function downloadMealPlanTemplates(numbers: string[]) {
  if (!numbers.length) return;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  numbers.forEach((n, i) => { if (i > 0) doc.addPage(); drawMealPlanTemplate(n, doc); });
  await preparePdfPrint(doc, `Meal plan requisitions ${numbers[0]} to ${numbers[numbers.length - 1]}`);
  doc.save(`Meal-plans-${numbers[0]}-to-${numbers[numbers.length - 1]}.pdf`);
}
