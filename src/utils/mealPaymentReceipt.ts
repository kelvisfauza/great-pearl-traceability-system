import jsPDF from 'jspdf';
import { addDepartmentStampPdf } from '@/utils/departmentStamps';
import { personalApprovalStamp } from '@/lib/departmentStampRules';
import { getSignatory } from '@/utils/approverSignatures';
import { COMPANY_TAGLINE } from '@/utils/companyBrand';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';

export type MealReceipt = {
  reference: string;
  request: { paper_document_number: string | null; invoice_number: string | null; description: string; admin_approved_by_name: string | null; finance_released_by_name: string | null };
  payment: { amount: number; withdraw_charge: number; total_amount: number; receiver_name: string; receiver_phone: string; yo_status: string; yo_reference: string | null; created_at: string; updated_at: string };
};

async function imageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The receipt signature or stamp could not be loaded.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read receipt image.'));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function buildMealReceiptPdf(data: MealReceipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 18;
  const text = (value: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(value || '-', w - 32);
    doc.text(lines, 16, y); y += lines.length * 5 + 3;
  };
  text('GREAT AGRO COFFEE', 17, true);
  text(COMPANY_TAGLINE, 9);
  text('P.O Box 431420, Kasese, Uganda', 9);
  text('MEAL PLAN PAYMENT RECEIPT', 15, true);
  text(`Receipt: ${data.reference}`, 9);
  text(`Requisition: ${data.request.paper_document_number || data.request.invoice_number || '-'}`, 10, true);
  text(`Paid on: ${new Date(data.payment.updated_at || data.payment.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })} (Uganda)`, 9);
  text(`Paid to: ${data.payment.receiver_name}`, 11, true);
  text(`Phone: ${data.payment.receiver_phone || '-'}`, 9);
  const description = doc.splitTextToSize(data.request.description || '-', w - 32);
  text('Meal details', 10, true);
  // Keep long descriptions on their own pages instead of covering approval signatures.
  for (const line of description) {
    if (y > 230) { doc.addPage(); y = 18; }
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(line, 16, y); y += 5;
  }
  y += 7;
  const channel = data.payment.yo_status === 'cash' ? 'Cash' : data.payment.yo_reference?.startsWith('GSP-') ? 'GosentePay' : 'Yo Payments';
  if (y > 160) { doc.addPage(); y = 18; }
  text(`Payment method: ${channel}`, 10);
  text(`Transaction: ${data.payment.yo_reference || data.reference}`, 9);
  text(`Amount: UGX ${Number(data.payment.amount).toLocaleString('en-UG')}   Charges: UGX ${Number(data.payment.withdraw_charge || 0).toLocaleString('en-UG')}`, 10);
  text(`TOTAL PAID: UGX ${Number(data.payment.total_amount).toLocaleString('en-UG')}`, 14, true);
  y += 8;
  const issuedAt = new Date().toISOString();
  for (const [index, stage] of [
    { label: 'ADMIN APPROVAL', name: data.request.admin_approved_by_name },
    { label: 'FINANCE PAYMENT', name: data.request.finance_released_by_name },
  ].entries()) {
    const x = index === 0 ? 16 : 112;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(stage.label, x, y);
    // Never borrow another person's signature when only a similar name is recorded.
    const signatory = getSignatory(undefined, stage.name);
    const normalized = (stage.name || '').trim().toLowerCase().replace(/\s+2$/, '');
    const exact = signatory && signatory.name.toLowerCase() === normalized ? signatory : undefined;
    if (stage.name) {
      if (exact?.signatureUrl) {
        const signature = await imageData(exact.signatureUrl);
        const props = doc.getImageProperties(signature);
        const height = Math.min(18, 55 * props.height / props.width);
        doc.addImage(signature, 'PNG', x, y + 6, height * props.width / props.height, height);
      }
      const key = index === 1 ? 'finance' : personalApprovalStamp(stage.name);
      if (key) await addDepartmentStampPdf(doc, key, x + 52, y + 4, 30, 26, issuedAt);
    }
    doc.line(x, y + 32, x + 80, y + 32);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(stage.name || 'Not recorded', 80), x, y + 38);
    if (stage.name && !exact?.signatureUrl) { doc.setFontSize(7); doc.text('Signature image not registered', x, y + 48); }
  }
  return doc;
}

export async function printMealPaymentReceipt(submissionId: string) {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow pop-ups to print the payment receipt.');
  preview.document.title = 'Preparing payment receipt';
  preview.document.body.textContent = 'Preparing payment receipt…';
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('meal-payment-receipt', { body: { submissionId } });
    if (error || !data?.ok) throw new Error(data?.error || 'The saved payment receipt could not be loaded.');
    const doc = await buildMealReceiptPdf(data as MealReceipt);
    await preparePdfPrint(doc, `Meal payment receipt ${data.request.paper_document_number || data.reference}`);
    doc.autoPrint();
    const url = doc.output('bloburl');
    if (!preview.closed) preview.location.href = String(url);
    setTimeout(() => URL.revokeObjectURL(String(url)), 120_000);
  } catch (error) { preview.close(); throw error; }
}