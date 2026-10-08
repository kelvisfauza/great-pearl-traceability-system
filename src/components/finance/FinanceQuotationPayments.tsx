import React, { useState } from 'react';
import { useQuotations, Quotation } from '@/hooks/useQuotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText } from 'lucide-react';

const money = (q: Quotation) => `${q.currency || 'UGX'} ${Math.round(Number(q.amount || 0)).toLocaleString()}`;

/** Approved quotations/invoices waiting for Finance to pay. Marking paid texts + emails the company. */
const FinanceQuotationPayments: React.FC = () => {
  const { quotations, markDisbursed } = useQuotations();
  const { toast } = useToast();
  const [active, setActive] = useState<Quotation | null>(null);
  const [method, setMethod] = useState('Mobile Money');
  const [ref, setRef] = useState('');
  const [saving, setSaving] = useState(false);

  const waiting = quotations.filter((q) => q.status === 'approved' && q.finance_status !== 'disbursed');
  if (!waiting.length) return null;

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await markDisbursed(active.id, method, ref || undefined);
      toast({ title: 'Marked as disbursed', description: `${active.company_name} has been sent a text and email.` });
      setActive(null); setRef('');
    } catch (e: any) {
      toast({ title: 'Not saved', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Approved quotations & invoices to pay</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {waiting.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div>
              <div className="font-medium">{q.company_name} — {money(q)}</div>
              <div className="text-xs text-muted-foreground">{q.reference} · {q.subject} · approved by {q.approval_by || 'Admin'}</div>
            </div>
            <Button size="sm" onClick={() => setActive(q)}>Mark as disbursed</Button>
          </div>
        ))}
      </CardContent>
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Disburse {active?.reference}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>{active?.company_name} — {active && money(active)}</p>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="GosentePay">GosentePay</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Payment reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
            <p className="text-xs text-muted-foreground">Record a payment you have already made. The company gets a text and email saying it has been disbursed.</p>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirm disbursed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FinanceQuotationPayments;
