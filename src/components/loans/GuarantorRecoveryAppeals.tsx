import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldAlert, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ugx = (n: number) => `UGX ${Math.round(Number(n) || 0).toLocaleString()}`;

type Recovery = {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  created_at: string;
  metadata: any;
};

export default function GuarantorRecoveryAppeals() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [picked, setPicked] = useState<Recovery | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [decideFor, setDecideFor] = useState<any | null>(null);
  const [penaltyRate, setPenaltyRate] = useState('10');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: ap }, { data: led }] = await Promise.all([
        (supabase as any).from('guarantor_recovery_appeals').select('*').order('created_at', { ascending: false }),
        (supabase as any)
          .from('ledger_entries')
          .select('id, user_id, amount, reference, created_at, metadata')
          .like('reference', 'LOAN-GUARANTOR-%')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      setAppeals(ap || []);
      setRecoveries((led || []) as Recovery[]);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const logAppeal = async () => {
    if (!picked) return;
    if (reason.trim().length < 15) {
      toast({ title: 'Add a reason', description: 'At least 15 characters.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const loanId = picked.metadata?.loan_id;
      const { data: loan } = await (supabase as any).from('loans').select('*').eq('id', loanId).maybeSingle();
      const { error } = await (supabase as any).from('guarantor_recovery_appeals').insert({
        loan_id: loanId,
        guarantor_user_id: picked.user_id,
        guarantor_email: loan?.guarantor_email ?? null,
        guarantor_name: loan?.guarantor_name ?? null,
        borrower_email: loan?.employee_email ?? picked.metadata?.borrower ?? null,
        borrower_name: loan?.employee_name ?? null,
        recovered_amount: Math.abs(Number(picked.amount)),
        recovery_reference: picked.reference,
        reason: reason.trim(),
      });
      if (error) throw error;
      toast({ title: 'Appeal recorded' });
      setNewOpen(false); setPicked(null); setReason('');
      load();
    } catch (e: any) {
      toast({ title: 'Could not record appeal', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const decide = async (uphold: boolean) => {
    if (!decideFor) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('resolve_guarantor_recovery_appeal', {
        p_appeal_id: decideFor.id,
        p_uphold: uphold,
        p_notes: notes || null,
        p_penalty_rate: Math.max(0, Number(penaltyRate) || 0) / 100,
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error);
      toast({
        title: uphold ? 'Appeal upheld' : 'Appeal rejected',
        description: uphold
          ? `Guarantor refunded ${ugx(data.refunded)}. Borrower charged ${ugx(data.borrower_charged)} (incl. ${ugx(data.penalty)} penalty).`
          : undefined,
      });
      setDecideFor(null); setNotes('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const appealedRefs = new Set(appeals.map((a) => a.recovery_reference));
  const openRecoveries = recoveries.filter((r) => !appealedRefs.has(r.reference));

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Upholding an appeal refunds the guarantor in full and charges the borrower the same amount plus a penalty.
          The borrower's wallet may go into overdraft — overdraft and loan charges keep running.
        </p>
        <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> Log appeal</Button>
      </div>

      {appeals.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No guarantor appeals yet.</CardContent></Card>}

      {appeals.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {a.guarantor_name || a.guarantor_email || 'Guarantor'} — {ugx(a.recovered_amount)}
              <Badge variant={a.status === 'pending' ? 'secondary' : a.status === 'upheld' ? 'default' : 'destructive'}>{a.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Borrower: <strong>{a.borrower_name || a.borrower_email}</strong></div>
            <div className="text-muted-foreground">{a.reason}</div>
            {a.status === 'upheld' && (
              <div className="text-xs">
                Refunded {ugx(a.refund_amount)} · Penalty {ugx(a.penalty_amount)} · Borrower charged {ugx(a.borrower_charged)}
              </div>
            )}
            {a.status === 'pending' && (
              <Button size="sm" className="mt-2" onClick={() => { setDecideFor(a); setPenaltyRate('10'); }}>Review</Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log a guarantor recovery appeal</DialogTitle>
            <DialogDescription>Pick the recovery the guarantor is disputing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {openRecoveries.length === 0 && <p className="text-sm text-muted-foreground">No un-appealed guarantor recoveries found.</p>}
              {openRecoveries.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPicked(r)}
                  className={`w-full text-left rounded-md border p-2 text-sm ${picked?.id === r.id ? 'border-primary bg-muted' : ''}`}
                >
                  <div className="font-medium">{ugx(Math.abs(Number(r.amount)))}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} · borrower: {r.metadata?.borrower || '—'} · {r.reference}
                  </div>
                </button>
              ))}
            </div>
            <div>
              <Label>Guarantor's reason</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy || !picked} onClick={logAppeal}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record appeal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decideFor} onOpenChange={(v) => !v && setDecideFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decide appeal</DialogTitle>
            <DialogDescription>
              {decideFor && `Refund ${ugx(decideFor.recovered_amount)} to the guarantor and charge it back to ${decideFor.borrower_name || decideFor.borrower_email} with a penalty.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Penalty (% of recovered amount)</Label>
              <Input type="number" value={penaltyRate} onChange={(e) => setPenaltyRate(e.target.value)} />
              {decideFor && (
                <p className="text-xs text-muted-foreground mt-1">
                  Borrower will be debited {ugx(Number(decideFor.recovered_amount) * (1 + (Number(penaltyRate) || 0) / 100))} in total.
                </p>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Uphold & charge borrower</Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
