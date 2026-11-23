import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Printer, Loader2, Receipt } from 'lucide-react';
import { stampQueuedPdf } from '@/utils/queuedPdfPrintStamp';
import { bypassPrint } from '@/lib/printInterceptor';
import { reportPrintError } from '@/lib/documentPrintStamp';

export default function FinanceReceiptLookup() {
  const [number, setNumber] = useState('');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [issuedForm, setIssuedForm] = useState<{ document_number: string; created_at: string; printed_at: string | null } | null>(null);
  const [requestsFound, setRequestsFound] = useState<any[]>([]);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const reference = number.trim().toUpperCase();
    if (!reference) return;
    setLoading(true); setError(''); setReceipts([]); setIssuedForm(null); setRequestsFound([]); setSearched(false);
    try {
      // Exact matching reaches old receipts without a recent-history row limit.
      const { data: requests, error: requestError } = await supabase
        .from('provider_submission_requests').select('id,invoice_number,paper_document_number,provider_name,amount,status,payout_status')
        .or(`paper_document_number.eq.${reference.replace(/[^A-Z0-9-]/g, '')},invoice_number.eq.${reference.replace(/[^A-Z0-9-]/g, '')}`);
      if (requestError) throw requestError;
      setRequestsFound(requests || []);
      if (/^MP-\d{4}-\d+$/.test(reference)) {
        const { data: form, error: formError } = await supabase.rpc('lookup_issued_meal_form', { p_number: reference }).maybeSingle();
        if (formError) throw formError;
        setIssuedForm(form);
      }
      const safeReference = reference.replace(/[^A-Z0-9-]/g, '');
      const conditions = [`reference.eq.${safeReference}`, `metadata->>invoice_number.eq.${safeReference}`];
      if (requests?.length) conditions.push(`source_id.in.(${requests.map(r => r.id).join(',')})`);
      const { data, error: receiptError } = await supabase.from('generated_receipts')
        .select('*').or(conditions.join(',')).order('created_at', { ascending: false });
      if (receiptError) throw receiptError;
      setReceipts(data || []); setSearched(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Payment receipts could not be loaded.'); }
    finally { setLoading(false); }
  };

  const print = async (receipt: any) => {
    // Reserve the window in the tap so verification cannot trigger a popup block.
    const printWindow = bypassPrint(() => window.open('', '_blank'));
    if (!printWindow) { setError('Allow pop-ups to open the payment receipt.'); return; }
    printWindow.document.title = 'Preparing payment receipt';
    printWindow.document.body.textContent = 'Preparing payment receipt…';
    setPrinting(receipt.id); setError('');
    try {
      const { data, error: downloadError } = await supabase.storage
        .from(receipt.storage_bucket || 'payment-receipts').download(receipt.storage_path);
      if (downloadError || !data) throw downloadError || new Error('The saved receipt PDF is unavailable.');
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read receipt PDF.'));
        reader.onerror = () => reject(new Error('Could not read receipt PDF.'));
        reader.readAsDataURL(data);
      });
      const verified = await stampQueuedPdf(content, `Payment receipt ${receipt.reference}`);
      if (printWindow.closed) return;
      printWindow.document.body.textContent = '';
      printWindow.document.title = `Payment receipt ${receipt.reference}`;
      const frame = printWindow.document.createElement('iframe');
      frame.title = `Payment receipt ${receipt.reference}`;
      frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
      frame.src = verified;
      printWindow.document.body.appendChild(frame);
    } catch (e) {
      printWindow.close(); reportPrintError(e);
      setError(e instanceof Error ? e.message : 'Receipt printing failed.');
    } finally { setPrinting(null); }
  };

  return <section className="space-y-4 border-b pb-5">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Receipt className="h-5 w-5 text-primary" /> Payment receipts</h2>
    <form onSubmit={search} className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex-1"><Label htmlFor="finance-receipt-number">Receipt or paper form number</Label>
        <Input id="finance-receipt-number" value={number} onChange={e => setNumber(e.target.value)} placeholder="MP-2026-000140" className="mt-1" required />
      </div>
      <Button type="submit" disabled={loading || !number.trim()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} Find receipt</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {searched && issuedForm && <div className="border rounded-lg p-3 space-y-1">
      <p className="font-semibold">Meal-plan form {issuedForm.document_number}</p>
      <p className="text-sm text-muted-foreground">Issued {new Date(issuedForm.created_at).toLocaleDateString('en-UG')} · {issuedForm.printed_at ? 'Printed' : 'Printing not recorded'}</p>
      {!requestsFound.length && <p className="text-sm">This form has not been submitted in Procurement. There is no saved meal request or payment receipt for it.</p>}
    </div>}
    {searched && requestsFound.map(request => <div key={request.id} className="border rounded-lg p-3 space-y-1">
      <p className="font-semibold">{request.paper_document_number || request.invoice_number} · {request.provider_name} · UGX {Number(request.amount).toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">Request: {request.status.replaceAll('_', ' ')}{request.payout_status ? ` · Payment: ${request.payout_status.replaceAll('_', ' ')}` : ''}</p>
    </div>)}
    {searched && !receipts.length && !(issuedForm && !requestsFound.length) && <p className="text-sm text-muted-foreground">{requestsFound.length ? 'The request was found, but no saved payment receipt is available. Check its payment status; do not pay again just to create a receipt.' : 'No issued meal form, submitted request or saved payment receipt matches this number.'}</p>}
    {receipts.map(receipt => <div key={receipt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-lg p-3">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold break-words">{receipt.recipient_name} · UGX {Number(receipt.total ?? receipt.amount).toLocaleString()}</p>
        <p className="text-sm break-words">{receipt.description}</p>
        <p className="text-xs text-muted-foreground break-words">{receipt.reference} · {receipt.payment_method} · {new Date(receipt.created_at).toLocaleDateString('en-UG')}</p>
      </div>
      <Button variant="outline" onClick={() => print(receipt)} disabled={printing !== null || !receipt.storage_path}>
        {printing === receipt.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print receipt
      </Button>
    </div>)}
  </section>;
}