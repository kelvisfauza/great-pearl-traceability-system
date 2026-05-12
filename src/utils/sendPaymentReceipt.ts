import { supabase } from '@/integrations/supabase/client';
import { generatePaymentReceiptPdf, buildReceiptReference, type ReceiptPayload } from './paymentReceiptPdf';

export interface SendReceiptInput extends Omit<ReceiptPayload, 'reference'> {
  reference?: string;          // auto-generated if missing
  recipientPhone?: string;     // overrides paidTo.phone for SMS
  recipientEmail?: string;     // overrides paidTo.email for email
  ccEmails?: string[];
}

export interface SendReceiptResult {
  ok: boolean;
  reference: string;
  pdfUrl?: string;
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
}

const shorten = (url: string) => url; // placeholder for future link shortener

export const sendPaymentReceipt = async (input: SendReceiptInput): Promise<SendReceiptResult> => {
  const reference = input.reference || buildReceiptReference();
  const errors: string[] = [];
  let pdfUrl: string | undefined;
  let emailSent = false;
  let smsSent = false;

  // 1) Generate PDF
  let pdfBlob: Blob;
  try {
    pdfBlob = await generatePaymentReceiptPdf({ ...input, reference });
  } catch (e: any) {
    return { ok: false, reference, emailSent, smsSent, errors: [`PDF generation failed: ${e.message}`] };
  }

  // 2) Upload to storage
  const path = `${new Date().getFullYear()}/${reference}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from('payment-receipts')
    .upload(path, pdfBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });
  if (uploadErr) {
    return { ok: false, reference, emailSent, smsSent, errors: [`Upload failed: ${uploadErr.message}`] };
  }
  pdfUrl = supabase.storage.from('payment-receipts').getPublicUrl(path).data.publicUrl;

  // 3) Send email (if email provided)
  let email = input.recipientEmail || input.paidTo.email;

  // Fallback: if no email but we have a phone, try to resolve a system user by phone
  if (!email && (input.recipientPhone || input.paidTo.phone)) {
    try {
      const rawPhone = (input.recipientPhone || input.paidTo.phone).replace(/\D/g, '');
      const last9 = rawPhone.slice(-9);
      const { data: emp } = await supabase
        .from('employees')
        .select('email, phone')
        .or(`phone.ilike.%${last9}%,phone.eq.+256${last9},phone.eq.256${last9},phone.eq.0${last9}`)
        .not('email', 'is', null)
        .limit(1)
        .maybeSingle();
      if (emp?.email) email = emp.email;
    } catch (e) {
      console.warn('Email lookup by phone failed:', e);
    }
  }

  if (email) {
    try {
      const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;
      const message = [
        `This serves as your official Payment Receipt from Great Pearl Coffee Company — Finance Department.`,
        ``,
        `Receipt No: ${reference}`,
        `Description: ${input.description}`,
        ...(input.invoiceNumber ? [`Invoice Reference: ${input.invoiceNumber}`] : []),
        `Amount: ${formatUGX(input.amount)}`,
        ...(input.charges > 0 ? [`Charges: ${formatUGX(input.charges)}`] : []),
        `Total Paid: ${formatUGX(input.total)}`,
        `Payment Method: ${input.paymentMethod}`,
        ...(input.transactionId ? [`Transaction ID: ${input.transactionId}`] : []),
        `Processed By: ${input.processedBy}`,
        ``,
        `Download the signed PDF receipt: ${pdfUrl}`,
        ``,
        `The PDF is digitally signed by Mukobi Godwin, Finance Manager. Please retain it for your records.`,
      ].join('\n');

      const { error: emailErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: email,
          idempotencyKey: `receipt-${reference}`,
          templateData: {
            subject: `Payment Receipt ${reference} — ${formatUGX(input.total)}`,
            title: `Payment Receipt — ${reference}`,
            recipientName: input.paidTo.name,
            message,
          },
        },
      });
      if (emailErr) errors.push(`Email error: ${emailErr.message}`);
      else emailSent = true;
    } catch (e: any) {
      errors.push(`Email error: ${e.message}`);
    }
  }

  // 4) Send SMS (if phone provided)
  const phone = input.recipientPhone || input.paidTo.phone;
  if (phone) {
    try {
      const totalStr = `UGX ${Number(input.total || 0).toLocaleString('en-UG')}`;
      const sms = `GREAT PEARL COFFEE — Payment Receipt ${reference}: ${totalStr} for "${input.description.substring(0, 40)}". Download: ${shorten(pdfUrl)}`;
      const { error: smsErr } = await supabase.functions.invoke('send-sms', {
        body: {
          phone,
          message: sms.substring(0, 320),
          messageType: 'payout_confirmation',
          userName: input.paidTo.name,
          recipientEmail: input.recipientEmail || input.paidTo.email,
        },
      });
      if (smsErr) errors.push(`SMS error: ${smsErr.message}`);
      else smsSent = true;
    } catch (e: any) {
      errors.push(`SMS error: ${e.message}`);
    }
  }

  return {
    ok: emailSent || smsSent,
    reference,
    pdfUrl,
    emailSent,
    smsSent,
    errors,
  };
};