import { supabase } from '@/integrations/supabase/client';
import { bypassPrint } from '@/lib/printInterceptor';

export type PrintJob = {
  id: string;
  user_id: string;
  user_email: string | null;
  title: string;
  doc_type: string;
  format: 'html' | 'pdf';
  content: string;
  copies: number;
  status: 'queued' | 'printed';
  printed_at: string | null;
  created_at: string;
  expires_at: string;
};

const EVENT = 'print-queue-changed';
export const notifyPrintQueueChanged = () => window.dispatchEvent(new CustomEvent(EVENT));
export function subscribePrintQueue(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

type QueueInput = {
  title: string;
  docType?: string;
  /** Full HTML document or fragment to print */
  html?: string;
  /** Base64 data URL of a PDF (jsPDF: doc.output('datauristring')) */
  pdfDataUrl?: string;
  copies?: number;
};

/** Add a document to the signed-in user's cross-device print queue. */
export async function addToPrintQueue(input: QueueInput): Promise<PrintJob | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const format: 'html' | 'pdf' = input.pdfDataUrl ? 'pdf' : 'html';
  const content = input.pdfDataUrl || input.html || '';
  if (!content) return null;

  const { data, error } = await supabase
    .from('print_jobs' as any)
    .insert({
      user_id: user.id,
      user_email: user.email,
      title: input.title,
      doc_type: input.docType || 'document',
      format,
      content,
      copies: input.copies || 1,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to queue print job:', error);
    return null;
  }
  notifyPrintQueueChanged();
  return data as unknown as PrintJob;
}

export async function fetchPrintJobs(status?: 'queued' | 'printed'): Promise<PrintJob[]> {
  let query = supabase
    .from('print_jobs' as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) {
    console.error('Failed to load print jobs:', error);
    return [];
  }
  return (data || []) as unknown as PrintJob[];
}

export async function markPrinted(ids: string[]) {
  if (!ids.length) return;
  await supabase
    .from('print_jobs' as any)
    .update({ status: 'printed', printed_at: new Date().toISOString() })
    .in('id', ids);
  notifyPrintQueueChanged();
}

export async function requeueJob(id: string) {
  await supabase
    .from('print_jobs' as any)
    .update({ status: 'queued', printed_at: null })
    .eq('id', id);
  notifyPrintQueueChanged();
}

export async function deleteJobs(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('print_jobs' as any).delete().in('id', ids);
  notifyPrintQueueChanged();
}

/** Housekeeping — removes anything older than a week. */
export async function cleanupExpiredPrintJobs() {
  try {
    await (supabase as any).rpc('cleanup_expired_print_jobs');
  } catch (e) {
    console.warn('print queue cleanup skipped', e);
  }
}

const stripDocumentWrapper = (html: string) => {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = body ? body[1] : html;
  const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map(m => m[0]).join('\n');
  return { inner, styles };
};

/** Print several HTML jobs in one browser print dialog, each on its own page. */
export function printHtmlJobs(jobs: PrintJob[]) {
  const parts = jobs.map(j => {
    const { inner, styles } = stripDocumentWrapper(j.content);
    return `${styles}<section class="pq-doc">${inner}</section>`;
  });

  const doc = `<!DOCTYPE html><html><head><title>Print Queue</title>
    <style>
      @page { margin: 0.4in; size: A4; }
      body { margin: 0; font-family: Arial, sans-serif; }
      .pq-doc { page-break-after: always; break-after: page; }
      .pq-doc:last-child { page-break-after: auto; break-after: auto; }
    </style>
  </head><body>${parts.join('')}</body></html>`;

  return bypassPrint(() => {
    const w = window.open('', '_blank', 'width=980,height=800');
    if (!w) return false;
    w.document.open();
    w.document.write(doc);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
    return true;
  });
}

/** Open a PDF job in a new tab and trigger its print dialog. */
export function printPdfJob(job: PrintJob) {
  return bypassPrint(() => {
  const w = window.open('', '_blank', 'width=980,height=800');
  if (!w) return false;
  w.document.open();
  w.document.write(
    `<!DOCTYPE html><html><head><title>${job.title}</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${job.content}"></iframe></body></html>`
  );
  w.document.close();
  return true;
  });
}
