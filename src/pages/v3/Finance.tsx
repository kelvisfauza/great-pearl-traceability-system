import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Wallet, Banknote, PlusCircle } from 'lucide-react';

export default function V3Finance() {
  const { hasRole, isV3Admin } = useV3Roles();
  const canApprove = isV3Admin || hasRole('finance_manager');
  const canPay = isV3Admin || hasRole('finance_manager', 'finance_officer');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState<Record<string, string>>({ method: 'cash' });
  const [floatOpen, setFloatOpen] = useState(false);
  const [floatForm, setFloatForm] = useState<Record<string, string>>({});

  const { data: payments = [] } = useQuery({
    queryKey: ['v3-payments'],
    queryFn: async () => (await supabase.from('v3_payments').select('*, v3_suppliers(name), v3_branches(name), v3_grns(grn_number, net_weight)').order('created_at', { ascending: false })).data as any[] || [],
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['v3-branch-float'],
    queryFn: async () => (await supabase.from('v3_branches').select('*').eq('active', true).order('name')).data as any[] || [],
  });

  const { data: floatLog = [] } = useQuery({
    queryKey: ['v3-float-log'],
    queryFn: async () => ((await (supabase.from('v3_float_transactions' as any) as any)
      .select('*, v3_branches(name)').order('created_at', { ascending: false }).limit(100)).data || []) as any[],
  });

  const rpc = (fn: string, args: any) => (supabase.rpc as any)(fn, args);

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await rpc('v3_approve_payment', { p_payment_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast({ title: 'Payment approved' }); qc.invalidateQueries({ queryKey: ['v3-payments'] }); },
    onError: (e: any) => toast({ title: 'Approval failed', description: e.message, variant: 'destructive' }),
  });

  const execute = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('v3_execute_payment', {
        p_payment_id: payTarget.id, p_method: payForm.method || 'cash', p_reference: payForm.reference || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({ title: `Payment ${d.payment_number} executed`, description: `Branch float now UGX ${Number(d.float_balance).toLocaleString()}.` });
      setPayOpen(false); setPayTarget(null); setPayForm({ method: 'cash' });
      qc.invalidateQueries({ queryKey: ['v3-payments'] });
      qc.invalidateQueries({ queryKey: ['v3-branch-float'] });
      qc.invalidateQueries({ queryKey: ['v3-float-log'] });
    },
    onError: (e: any) => toast({ title: 'Payment failed', description: e.message, variant: 'destructive' }),
  });

  const topup = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('v3_topup_branch_float', {
        p_branch_id: floatForm.branch_id, p_amount: Number(floatForm.amount || 0),
        p_reference: floatForm.reference || null, p_note: floatForm.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Float topped up' });
      setFloatOpen(false); setFloatForm({});
      qc.invalidateQueries({ queryKey: ['v3-branch-float'] });
      qc.invalidateQueries({ queryKey: ['v3-float-log'] });
    },
    onError: (e: any) => toast({ title: 'Top-up failed', description: e.message, variant: 'destructive' }),
  });

  const pending = payments.filter((p: any) => ['draft', 'pending_approval'].includes(p.status));
  const approved = payments.filter((p: any) => p.status === 'approved');

  return (
    <V3Layout
      title="Finance & Payments"
      description="Supplier payment approvals, execution against branch float and float top-ups"
      actions={canApprove && (
        <Button size="sm" onClick={() => setFloatOpen(true)}><PlusCircle className="h-4 w-4 mr-1" /> Top up float</Button>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {branches.map((b: any) => (
          <Card key={b.id}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> {b.name} float</p>
            <p className="text-lg font-semibold tabular-nums">UGX {Number(b.float_balance || 0).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Approval limit UGX {Number(b.approval_limit || 0).toLocaleString()}</p>
          </CardContent></Card>
        ))}
        <Card><CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground">Awaiting approval</p>
          <p className="text-lg font-semibold tabular-nums">{pending.length}</p>
          <p className="text-[11px] text-muted-foreground">UGX {pending.reduce((s: number, p: any) => s + Number(p.amount || 0), 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground">Approved, awaiting payout</p>
          <p className="text-lg font-semibold tabular-nums">{approved.length}</p>
          <p className="text-[11px] text-muted-foreground">UGX {approved.reduce((s: number, p: any) => s + Number(p.amount || 0), 0).toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments"><Banknote className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
          <TabsTrigger value="float"><Wallet className="h-4 w-4 mr-1" /> Float ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment requests</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Payment</TableHead><TableHead>GRN</TableHead><TableHead>Supplier</TableHead><TableHead>Branch</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {payments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No payment requests.</TableCell></TableRow>}
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.payment_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.v3_grns?.grn_number || '—'}</TableCell>
                      <TableCell>{p.v3_suppliers?.name || '—'}</TableCell>
                      <TableCell className="text-xs">{p.v3_branches?.name || '—'}</TableCell>
                      <TableCell className="tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{p.method}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status.replace(/_/g, ' ')}</Badge>
                        {p.failure_reason && <p className="text-[11px] text-destructive mt-1">{p.failure_reason}</p>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canApprove && ['draft', 'pending_approval'].includes(p.status) && (
                          <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(p.id)}>Approve</Button>
                        )}
                        {canPay && p.status === 'approved' && (
                          <Button size="sm" onClick={() => { setPayTarget(p); setPayForm({ method: p.method || 'cash' }); setPayOpen(true); }}>Pay supplier</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="float" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Branch float movements</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Branch</TableHead><TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Balance after</TableHead><TableHead>Note</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {floatLog.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No float movements yet.</TableCell></TableRow>}
                  {floatLog.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{new Date(f.created_at).toLocaleString()}</TableCell>
                      <TableCell>{f.v3_branches?.name || '—'}</TableCell>
                      <TableCell><Badge variant={f.direction === 'credit' ? 'default' : 'secondary'}>{f.direction === 'credit' ? 'Top-up' : 'Payout'}</Badge></TableCell>
                      <TableCell className="tabular-nums">UGX {Number(f.amount).toLocaleString()}</TableCell>
                      <TableCell className="tabular-nums">UGX {Number(f.balance_after || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.note || f.reference || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pay supplier — {payTarget?.payment_number}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {payTarget?.v3_suppliers?.name} · <span className="font-medium text-foreground">UGX {Number(payTarget?.amount || 0).toLocaleString()}</span> from {payTarget?.v3_branches?.name || 'branch'} float
            </p>
            <div>
              <Label>Method</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile money</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Transaction reference</Label><Input value={payForm.reference || ''} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => execute.mutate()} disabled={execute.isPending}>Confirm payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={floatOpen} onOpenChange={setFloatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Top up branch float</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Branch</Label>
              <Select value={floatForm.branch_id} onValueChange={(v) => setFloatForm({ ...floatForm, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount (UGX)</Label><Input type="number" value={floatForm.amount || ''} onChange={(e) => setFloatForm({ ...floatForm, amount: e.target.value })} /></div>
            <div><Label>Reference</Label><Input value={floatForm.reference || ''} onChange={(e) => setFloatForm({ ...floatForm, reference: e.target.value })} /></div>
            <div><Label>Note</Label><Input value={floatForm.note || ''} onChange={(e) => setFloatForm({ ...floatForm, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => topup.mutate()} disabled={topup.isPending}>Top up</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </V3Layout>
  );
}
