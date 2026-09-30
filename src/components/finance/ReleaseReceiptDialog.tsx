import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ListPlus, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { addToPrintQueue, printPdfJob } from '@/lib/printQueue';
import { buildReleaseReceiptPdf, ReleaseReceiptData } from '@/utils/financeReleaseReceipt';

/** Shown after Finance releases money. A receipt must be printed, queued or downloaded before closing. */
export const ReleaseReceiptDialog: React.FC<{ data: ReleaseReceiptData | null; onClose: () => void }> = ({ data, onClose }) => {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const pdf = () => buildReleaseReceiptPdf(data);
  const title = `Payment receipt ${data.reference}`;

  const printNow = () => {
    const url = pdf().output('datauristring');
    printPdfJob({ id: 'now', title, content: url } as any);
    setDone(true);
  };
  const queue = async () => {
    setBusy(true);
    const job = await addToPrintQueue({ title, docType: 'finance_receipt', pdfDataUrl: pdf().output('datauristring') });
    setBusy(false);
    if (job) { toast.success('Receipt added to print queue'); setDone(true); }
    else toast.error('Could not add to print queue');
  };
  const download = () => { pdf().save(`${data.reference}.pdf`); setDone(true); };
  const close = () => { setDone(false); onClose(); };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && done) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Payment released</DialogTitle>
          <DialogDescription>
            UGX {Number(data.amount).toLocaleString()} to {data.recipientName || 'recipient'} — Ref {data.reference}.
            Print, queue or download the receipt before closing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button onClick={printNow}><Printer className="h-4 w-4 mr-2" /> Print now</Button>
          <Button variant="outline" onClick={queue} disabled={busy}><ListPlus className="h-4 w-4 mr-2" /> {busy ? 'Adding…' : 'Add to print queue'}</Button>
          <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
          <Button variant="ghost" onClick={close} disabled={!done}>{done ? 'Done' : 'Choose an option above first'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseReceiptDialog;
