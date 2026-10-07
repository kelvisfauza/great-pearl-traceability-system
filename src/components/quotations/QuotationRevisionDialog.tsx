import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Quotation } from '@/hooks/useQuotations';

interface Props {
  quotation: Quotation;
  onSubmit: (opts: { file: File | null; amount: number | null; changes: string }) => Promise<void>;
}

const QuotationRevisionDialog = ({ quotation, onSubmit }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState(quotation.amount != null ? String(quotation.amount) : '');
  const [changes, setChanges] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!file && !amount) {
      toast({ title: 'Attach the revised document or enter the new price', variant: 'destructive' });
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      toast({ title: 'File is larger than 10MB', variant: 'destructive' });
      return;
    }
    if (!changes.trim()) {
      toast({ title: 'Describe what the supplier changed', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ file, amount: amount ? Number(amount) : null, changes: changes.trim() });
      toast({ title: 'Revision attached', description: 'The quotation is back in the review list.' });
      setOpen(false);
      setFile(null);
      setChanges('');
    } catch (err) {
      toast({ title: 'Could not attach revision', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" /> Attach revised quotation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach revised quotation</DialogTitle>
            <DialogDescription>
              {quotation.company_name} — current price {quotation.currency} {quotation.amount != null ? new Intl.NumberFormat('en-UG').format(quotation.amount) : '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Revised document (PDF, Word or photo)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Adjusted proposed price ({quotation.currency})</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>What the supplier changed</Label>
              <Textarea rows={3} value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="e.g. Reduced installation fee, added 2 extra access points." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuotationRevisionDialog;
