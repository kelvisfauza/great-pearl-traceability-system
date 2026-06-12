import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Scale, ThumbsUp, ThumbsDown, Repeat, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendLoanAgreement } from '@/utils/sendLoanAgreement';

type Vote = { id: string; admin_id: string; admin_email: string | null; vote_type: 'uphold' | 'approve_full' | 'counter'; counter_amount: number | null; counter_term_months: number | null; reason: string; created_at: string };
type Appeal = {
  id: string;
  user_id: string;
  employee_email: string;
  employee_name: string | null;
  requested_amount: number;
  offered_amount: number;
  loan_type: string;
  requested_term_months: number;
  justification: string;
  evaluation_snapshot: any;
  status: string;
  final_amount: number | null;
  final_term_months: number | null;
  final_decision: string | null;
  decided_at: string | null;
  expires_at: string;
  created_at: string;
  resulting_loan_id?: string | null;
};

export default function LoanAppeals() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [votesByAppeal, setVotesByAppeal] = useState<Record<string, Vote[]>>({});
  const [voteFor, setVoteFor] = useState<Appeal | null>(null);
  const [voteType, setVoteType] = useState<'uphold' | 'approve_full' | 'counter'>('uphold');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterTerm, setCounterTerm] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [sendingPdfFor, setSendingPdfFor] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      setMe({ id: u?.user?.id || '', email: u?.user?.email || null });
      const { data: a, error } = await (supabase as any).from('loan_appeals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAppeals((a as Appeal[]) || []);
      const ids = ((a as Appeal[]) || []).map((x) => x.id);
      if (ids.length) {
        const { data: v } = await (supabase as any).from('loan_appeal_votes').select('*').in('appeal_id', ids);
        const grouped: Record<string, Vote[]> = {};
        ((v as any[]) || []).forEach((row: any) => {
          (grouped[row.appeal_id] ||= []).push(row as Vote);
        });
        setVotesByAppeal(grouped);
      } else {
        setVotesByAppeal({});
      }
      // Auto-recovery: any decided appeal without a resulting loan needs disbursement
      const stuck = ((a as Appeal[]) || []).filter((x: any) =>
        ['decided_approve', 'decided_counter'].includes(x.status) && !x.resulting_loan_id
      );
      for (const s of stuck) {
        // eslint-disable-next-line no-await-in-loop
        await tryAutoDisburse(s.id);
      }
    } catch (e: any) {
      toast({ title: 'Failed to load appeals', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tryAutoDisburse = async (appealId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('loan-appeal-disburse', { body: { appeal_id: appealId } });
      if (error) throw error;
      if (data?.ok && !data?.already) {
        toast({ title: 'Loan auto-disbursed', description: 'Funds credited to the borrower\u2019s wallet.' });
      } else if (data?.ok === false) {
        console.warn('disburse skipped', data.error);
      }
    } catch (e) {
      console.warn('auto-disburse failed', e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submitVote = async () => {
    if (!voteFor || !me?.id) return;
    if (reason.trim().length < 20) {
      toast({ title: 'Reason too short', description: 'Write at least 20 characters explaining your decision.', variant: 'destructive' });
      return;
    }
    if (voteType === 'counter') {
      if (!Number(counterAmount) || !Number(counterTerm)) {
        toast({ title: 'Counter-offer needs amount and term', variant: 'destructive' });
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: any = {
        appeal_id: voteFor.id,
        admin_id: me.id,
        admin_email: me.email,
        vote_type: voteType,
        reason: reason.trim(),
        counter_amount: voteType === 'counter' ? Number(counterAmount) : null,
        counter_term_months: voteType === 'counter' ? Number(counterTerm) : null,
      };
      const { error } = await (supabase as any).from('loan_appeal_votes').insert(payload);
      if (error) throw error;
      toast({ title: 'Vote recorded', description: 'Appeal auto-finalizes when 3 admins agree.' });
      const appealIdJustVoted = voteFor.id;
      setVoteFor(null);
      setReason('');
      setCounterAmount('');
      setCounterTerm('');
      setVoteType('uphold');
      await fetchAll();
      // Re-read the appeal to see if it just became decided — then auto-disburse
      const { data: fresh } = await (supabase as any).from('loan_appeals').select('status, resulting_loan_id').eq('id', appealIdJustVoted).maybeSingle();
      if (fresh && !fresh.resulting_loan_id && ['decided_approve', 'decided_counter'].includes(fresh.status)) {
        await tryAutoDisburse(appealIdJustVoted);
        fetchAll();
      }
    } catch (e: any) {
      toast({ title: 'Vote failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pending = appeals.filter((a) => a.status === 'pending_admin_review');
  const decided = appeals.filter((a) => a.status !== 'pending_admin_review');

  const tallySummary = (votes: Vote[]) => {
    const counts: Record<string, number> = { uphold: 0, approve_full: 0, counter: 0 };
    votes.forEach((v) => (counts[v.vote_type] = (counts[v.vote_type] || 0) + 1));
    return counts;
  };

  const renderCard = (a: Appeal) => {
    const votes = votesByAppeal[a.id] || [];
    const counts = tallySummary(votes);
    const myVote = votes.find((v) => v.admin_id === me?.id);
    const resultingLoanId = (a as any).resulting_loan_id as string | null | undefined;
    const handleSendPdf = async () => {
      if (!resultingLoanId) return;
      setSendingPdfFor(a.id);
      const res = await sendLoanAgreement(resultingLoanId, me?.email || 'Administration');
      setSendingPdfFor(null);
      if (res.ok) {
        toast({ title: 'Agreement sent', description: `PDF emailed to ${a.employee_email}.` });
      } else {
        toast({ title: 'Failed to send agreement', description: (res as any).error, variant: 'destructive' });
      }
    };
    return (
      <Card key={a.id} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{a.employee_name || a.employee_email}</CardTitle>
              <div className="text-xs text-muted-foreground">{a.employee_email} · {a.loan_type} · {a.requested_term_months} mo</div>
            </div>
            <Badge variant={a.status === 'pending_admin_review' ? 'secondary' : 'default'}>{a.status.replace(/_/g, ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-muted/40 p-2">
              <div className="text-[11px] text-muted-foreground">Requested</div>
              <div className="font-semibold">UGX {Number(a.requested_amount).toLocaleString()}</div>
            </div>
            <div className="rounded bg-muted/40 p-2">
              <div className="text-[11px] text-muted-foreground">System offered</div>
              <div className="font-semibold">UGX {Number(a.offered_amount).toLocaleString()}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Justification</div>
            <div className="rounded border bg-background p-2 whitespace-pre-wrap">{a.justification}</div>
          </div>
          {a.evaluation_snapshot ? (
            <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-2">
              <div className="font-semibold text-sm">Evaluation Report</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Decision:</span> <strong className="uppercase">{a.evaluation_snapshot.decision || '—'}</strong></div>
                <div><span className="text-muted-foreground">Risk score:</span> <strong>{a.evaluation_snapshot.risk_score ?? '—'}/100</strong></div>
                <div><span className="text-muted-foreground">Monthly salary:</span> <strong>UGX {Number(a.evaluation_snapshot.salary || 0).toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">System max limit:</span> <strong>UGX {Number(a.evaluation_snapshot.max_limit || a.evaluation_snapshot.loan_limit || 0).toLocaleString()}</strong></div>
                {a.evaluation_snapshot.recommended_amount != null && (
                  <div><span className="text-muted-foreground">Recommended:</span> <strong>UGX {Number(a.evaluation_snapshot.recommended_amount).toLocaleString()}</strong></div>
                )}
                {a.evaluation_snapshot.outstanding != null && (
                  <div><span className="text-muted-foreground">Outstanding:</span> <strong>UGX {Number(a.evaluation_snapshot.outstanding).toLocaleString()}</strong></div>
                )}
                {a.evaluation_snapshot.active_loans != null && (
                  <div><span className="text-muted-foreground">Active loans:</span> <strong>{a.evaluation_snapshot.active_loans}</strong></div>
                )}
                {a.evaluation_snapshot.wallet_balance != null && (
                  <div><span className="text-muted-foreground">Wallet balance:</span> <strong>UGX {Number(a.evaluation_snapshot.wallet_balance).toLocaleString()}</strong></div>
                )}
              </div>
              {(a.evaluation_snapshot.factors || []).length > 0 && (
                <div>
                  <div className="font-semibold mt-1">Key factors / reasons:</div>
                  <ul className="list-disc pl-4">
                    {(a.evaluation_snapshot.factors || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              {(a.evaluation_snapshot.denial_reasons || []).length > 0 && (
                <div>
                  <div className="font-semibold mt-1">Denial reasons:</div>
                  <ul className="list-disc pl-4">
                    {a.evaluation_snapshot.denial_reasons.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded border border-dashed p-2 text-xs text-muted-foreground">No evaluation report was attached to this appeal.</div>
          )}
          <div className="rounded border p-2 text-xs">
            <div className="font-semibold mb-1">Votes ({votes.length}/3 needed to decide)</div>
            <div className="flex gap-3">
              <span>Uphold: <strong>{counts.uphold}</strong></span>
              <span>Approve full: <strong>{counts.approve_full}</strong></span>
              <span>Counter: <strong>{counts.counter}</strong></span>
            </div>
            {votes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {votes.map((v) => (
                  <li key={v.id} className="border-t pt-1">
                    <span className="font-medium">{v.admin_email || v.admin_id.slice(0, 8)}</span> →{' '}
                    <Badge variant="outline" className="ml-1">{v.vote_type}{v.vote_type === 'counter' && v.counter_amount ? ` UGX ${Number(v.counter_amount).toLocaleString()} × ${v.counter_term_months}m` : ''}</Badge>
                    <div className="text-muted-foreground">{v.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {a.status === 'pending_admin_review' && !myVote && (
            <Button onClick={() => setVoteFor(a)} className="w-full">Cast my vote</Button>
          )}
          {a.final_decision && (
            <div className="rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 p-2 text-xs">
              <strong>Final:</strong> {a.final_decision} — UGX {Number(a.final_amount || 0).toLocaleString()}
              {a.final_term_months ? ` × ${a.final_term_months} months` : ''}
            </div>
          )}
          {resultingLoanId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendPdf}
              disabled={sendingPdfFor === a.id}
              className="w-full"
            >
              {sendingPdfFor === a.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating & sending…</>
              ) : (
                <><FileText className="mr-2 h-4 w-4" /> Send Agreement PDF to borrower</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Scale className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Loan Appeals</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Borrowers can appeal denials or reduced offers. Each appeal is finalized once <strong>3 admins independently agree</strong> on the same decision (uphold, approve in full, or the same counter-offer). You must attach a written reason with every vote.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading appeals…</div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="decided">Decided ({decided.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-3">
            {pending.length === 0 ? <div className="text-sm text-muted-foreground">No pending appeals.</div> : pending.map(renderCard)}
          </TabsContent>
          <TabsContent value="decided" className="space-y-3 mt-3">
            {decided.length === 0 ? <div className="text-sm text-muted-foreground">No decided appeals yet.</div> : decided.map(renderCard)}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!voteFor} onOpenChange={(o) => !o && setVoteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cast your vote</DialogTitle>
          </DialogHeader>
          {voteFor && (
            <div className="space-y-3 text-sm">
              <div className="rounded bg-muted/40 p-2 text-xs">
                <div>{voteFor.employee_name} · {voteFor.loan_type}</div>
                <div>Requested UGX {Number(voteFor.requested_amount).toLocaleString()} · Offered UGX {Number(voteFor.offered_amount).toLocaleString()}</div>
              </div>
              <div>
                <Label>Decision</Label>
                <Select value={voteType} onValueChange={(v) => setVoteType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uphold"><ThumbsDown className="h-3 w-3 inline mr-1" /> Uphold evaluation (deny / keep offered amount)</SelectItem>
                    <SelectItem value="approve_full"><ThumbsUp className="h-3 w-3 inline mr-1" /> Approve requested amount in full</SelectItem>
                    <SelectItem value="counter"><Repeat className="h-3 w-3 inline mr-1" /> Counter-offer (custom amount/term)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {voteType === 'counter' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Counter amount (UGX)</Label>
                    <Input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>Term (months)</Label>
                    <Input type="number" value={counterTerm} onChange={(e) => setCounterTerm(e.target.value)} />
                  </div>
                  <div className="col-span-2 text-[11px] text-muted-foreground">
                    For a counter-offer to pass, 3 admins must vote the same exact amount and term.
                  </div>
                </div>
              )}
              <div>
                <Label>Reason (required, min 20 chars)</Label>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Document your reasoning so it appears in the audit trail." />
              </div>
              <Button onClick={submitVote} disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit vote'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}