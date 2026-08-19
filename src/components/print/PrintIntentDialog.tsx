import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Printer, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PRINT_INTENT_EVENT, type PrintIntent } from '@/lib/printInterceptor';
import { addToPrintQueue } from '@/lib/printQueue';

/**
 * Global "print now or queue it?" prompt. Mounted once in App so every
 * print in the system (all departments, v1 and v2) goes through it.
 */
const PrintIntentDialog = () => {
  const [intent, setIntent] = useState<PrintIntent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<PrintIntent>;
      if (!ev.detail) return;
      ev.preventDefault(); // tell the interceptor we're handling it
      setIntent(ev.detail);
    };
    window.addEventListener(PRINT_INTENT_EVENT, handler as EventListener);
    return () => window.removeEventListener(PRINT_INTENT_EVENT, handler as EventListener);
  }, []);

  const close = () => { setIntent(null); setSaving(false); };

  const handlePrintNow = () => {
    intent?.now();
    close();
  };

  const handleQueue = async () => {
    if (!intent) return;
    setSaving(true);
    const job = await addToPrintQueue({
      title: intent.title || 'Document',
      docType: 'document',
      html: intent.html || '',
    });
    intent.dismiss();
    close();
    if (job) toast.success('Added to your print queue', { description: 'Open Print Queue to print everything at once.' });
    else toast.error('Could not add to print queue');
  };

  const handleCancel = () => {
    intent?.cancel();
    intent?.dismiss();
    close();
  };

  return (
    <AlertDialog open={!!intent} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Print or add to queue?</AlertDialogTitle>
          <AlertDialogDescription>
            {intent?.title ? `"${intent.title}" ` : 'This document '}
            can be printed now, or saved to your print queue so you can print
            several documents together later — from any device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={handleQueue} disabled={saving}>
            <ListPlus className="h-4 w-4 mr-2" />
            {saving ? 'Adding…' : 'Add to queue'}
          </Button>
          <AlertDialogAction onClick={handlePrintNow}>
            <Printer className="h-4 w-4 mr-2" />
            Print now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PrintIntentDialog;
