import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { generateVerificationCode, getVerificationUrl } from '@/utils/verificationCode';
import { issuePrintStamp, type PrintStamp } from './documentIssuance';
import { toast } from 'sonner';

export const createDocumentPrintStamp = (title: string, format: string): Promise<PrintStamp> => issuePrintStamp(title, format, {
  identity: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) throw new Error('Please sign in before printing.');
    const { data: employee, error: employeeError } = await supabase.from('employees')
      .select('name').ilike('email', user.email).maybeSingle();
    if (employeeError || !employee?.name) throw new Error('Your employee name could not be loaded. Please try again.');
    return { id: user.id, name: employee.name };
  },
  code: () => generateVerificationCode('document'),
  url: getVerificationUrl,
  qr: url => QRCode.toDataURL(url, { width: 256, margin: 4, errorCorrectionLevel: 'M' }),
  register: async record => {
    const { error } = await supabase.from('verifications').insert(record as any);
    if (error) throw new Error('Verification could not be registered. No document was issued. Please try again.');
  },
});

export const reportPrintError = (error: unknown) => toast.error('Unable to prepare verified document', {
  description: error instanceof Error ? error.message : 'Please try again.',
});

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

export function stampHtmlDocument(html: string, stamp: PrintStamp): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('[data-system-print-stamp], style[data-system-print-style]').forEach(el => el.remove());
  // Captured onload print scripts must not restart the intent dialog.
  doc.querySelectorAll('script').forEach(el => el.remove());
  const style = doc.createElement('style');
  style.dataset.systemPrintStyle = 'true';
  style.textContent = `
    [data-system-print-stamp]{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;border-top:1px solid #777!important;margin-top:16px!important;padding-top:8px!important;color:#111!important;background:#fff!important;font:10px Arial,sans-serif!important;break-inside:avoid!important;clear:both!important}
    [data-system-print-stamp] img{display:block!important;width:76px!important;height:76px!important;max-width:76px!important;max-height:76px!important;margin:0!important}
    [data-system-print-stamp] p{margin:3px 0!important;overflow-wrap:anywhere!important}
    @media print{[data-system-print-stamp]{display:flex!important;visibility:visible!important}}
  `;
  doc.head.appendChild(style);
  const footer = doc.createElement('footer');
  footer.dataset.systemPrintStamp = stamp.code;
  footer.innerHTML = `<div><p><strong>Printed by: ${escapeHtml(stamp.printedBy)}</strong></p><p>${escapeHtml(new Date(stamp.printedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' }))} (Uganda)</p><p>Great Agro Coffee — a member of YEDA Coffee Company Limited</p><p>${escapeHtml(stamp.code)} · Scan to verify document issuance</p></div><img src="${stamp.qr}" alt="Document verification QR code" />`;
  doc.body.appendChild(footer);
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

export async function prepareHtmlPrint(html: string, title: string): Promise<string> {
  return stampHtmlDocument(html, await createDocumentPrintStamp(title, 'html'));
}