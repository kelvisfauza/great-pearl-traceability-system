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

  const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;

  // Resolve Finance Manager (Mukobi Godwin) email so he always gets a copy
  let financeManagerEmail: string | undefined;
  try {
    const { data: fm } = await supabase
      .from('employees')
      .select('email')
      .or('name.ilike.%mukobi godwin%,name.ilike.%godwin mukobi%')
      .not('email', 'is', null)
      .limit(1)
      .maybeSingle();
    financeManagerEmail = fm?.email || undefined;
  } catch (e) {
    console.warn('Finance manager lookup failed:', e);
  }
  // Fallback to a known mailbox if lookup misses
  if (!financeManagerEmail) financeManagerEmail = 'finance@greatpearlcoffee.com';

  // 3 + 4) Run email and SMS in PARALLEL so the UI doesn't wait twice
  const tasks: Promise<unknown>[] = [];

  if (email) {
    tasks.push(
      supabase.functions
        .invoke('send-transactional-email', {
          body: {
            templateName: 'payment-receipt',
            recipientEmail: email,
            idempotencyKey: `receipt-${reference}`,
            templateData: {
              recipientName: input.paidTo.name,
              reference,
              description: input.description,
              invoiceNumber: input.invoiceNumber,
              amount: formatUGX(input.amount),
              charges: input.charges > 0 ? formatUGX(input.charges) : undefined,
              total: formatUGX(input.total),
              paymentMethod: input.paymentMethod,
              transactionId: input.transactionId,
              processedBy: input.processedBy,
              pdfUrl,
            },
          },
        })
        .then(({ error: emailErr }) => {
          if (emailErr) errors.push(`Email error: ${emailErr.message}`);
          else emailSent = true;
        })
        .catch((e: any) => errors.push(`Email error: ${e.message}`)),
    );
  }

  // Always send a copy to the Finance Manager (Mukobi Godwin) — unless he is the recipient
  if (financeManagerEmail && financeManagerEmail.toLowerCase() !== (email || '').toLowerCase()) {
    tasks.push(
      supabase.functions
        .invoke('send-transactional-email', {
          body: {
            templateName: 'payment-receipt',
            recipientEmail: financeManagerEmail,
            idempotencyKey: `receipt-${reference}-fm`,
            templateData: {
              recipientName: `[Finance Copy] ${input.paidTo.name}`,
              reference,
              description: input.description,
              invoiceNumber: input.invoiceNumber,
              amount: formatUGX(input.amount),
              charges: input.charges > 0 ? formatUGX(input.charges) : undefined,
              total: formatUGX(input.total),
              paymentMethod: input.paymentMethod,
              transactionId: input.transactionId,
              processedBy: input.processedBy,
              pdfUrl,
            },
          },
        })
        .catch((e: any) => console.warn('Finance Manager copy failed:', e?.message)),
    );
  }

  const phone = input.recipientPhone || input.paidTo.phone;
  if (phone) {
    const totalStr = formatUGX(input.total);
    const sms = `GREAT PEARL COFFEE — Payment Receipt ${reference}: ${totalStr} for "${input.description.substring(0, 40)}". Download: ${shorten(pdfUrl)}`;
    tasks.push(
      supabase.functions
        .invoke('send-sms', {
          body: {
            phone,
            message: sms.substring(0, 320),
            messageType: 'payout_confirmation',
            userName: input.paidTo.name,
            recipientEmail: email,
          },
        })
        .then(({ error: smsErr }) => {
          if (smsErr) errors.push(`SMS error: ${smsErr.message}`);
          else smsSent = true;
        })
        .catch((e: any) => errors.push(`SMS error: ${e.message}`)),
    );
  }

  await Promise.all(tasks);

  return {
    ok: emailSent || smsSent,
    reference,
    pdfUrl,
    emailSent,
    smsSent,
    errors,
  };
};