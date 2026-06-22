import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Send, Loader2, Printer, Search, Banknote, Smartphone } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

const SupportStaffPerDiemSection: React.FC = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    receiverName: '',
    receiverPhone: '',
    nationalId: '',
    description: '',
    amount: '',
    withdrawCharge: '',
    paymentMethod: 'mobile_money' as 'mobile_money' | 'cash',
    notes: '',
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['support-staff-per-diem'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_staff_per_diem' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const formatAmount = (v: number) => `UGX ${Number(v || 0).toLocaleString('en-UG')}`;

  const resetForm = () => setForm({
    receiverName: '', receiverPhone: '', nationalId: '', description: '',
    amount: '', withdrawCharge: '', paymentMethod: 'mobile_money', notes: '',
  });

  const handleSubmit = async () => {
    if (!form.receiverName || !form.amount || !form.description) {
      toast({ title: 'Missing fields', description: 'Name, amount and description are required', variant: 'destructive' });
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 500) {
      toast({ title: 'Invalid amount', description: 'Amount must be at least UGX 500', variant: 'destructive' });
      return;
    }
    if (form.paymentMethod === 'mobile_money' && !form.receiverPhone) {
      toast({ title: 'Phone required', description: 'Mobile money requires a phone number', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-staff-perdiem', {
        body: {
          receiverName: form.receiverName,
          phone: form.receiverPhone,
          nationalId: form.nationalId,
          description: form.description,
          amount,
          withdrawCharge: parseFloat(form.withdrawCharge) || 0,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          initiatedBy: employee?.email || '',
          initiatedByName: employee?.name || '',
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'Per-diem recorded', description: data.message || 'Done' });
        resetForm();
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['support-staff-per-diem'] });
      } else {
        toast({ title: 'Issue', description: data?.error || data?.message || 'Failed', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to process per-diem', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, method: string) => {
    if (method === 'cash') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Cash (Finance)</Badge>;
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sent</Badge>;
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</Badge>;
      case 'pending_approval': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending Yo</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
      default: return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? records.filter((d: any) =>
        (d.receiver_name || '').toLowerCase().includes(term) ||
        (d.receiver_phone || '').toLowerCase().includes(term) ||
        (d.national_id || '').toLowerCase().includes(term) ||
        (d.description || '').toLowerCase().includes(term)
      )
    : records.slice(0, 5);

  const handlePrint = () => {
    const rows = records.map((d: any) => `
      <tr>
        <td>${new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td>${d.receiver_name || '—'}</td>
        <td>${d.national_id || ''}</td>
        <td>${d.receiver_phone || ''}</td>
        <td>${d.description || ''}</td>
        <td style="text-align:right">${formatAmount(d.amount)}</td>
        <td style="text-align:right">${formatAmount(d.total_amount)}</td>
        <td>${d.payment_method === 'cash' ? 'Cash' : 'MoMo'}</td>
        <td>${d.yo_status || ''}</td>
        <td>${d.initiated_by_name || ''}</td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><title>Support Staff Per-Diem</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f4f6}</style></head><body>
      <h1>Support Staff Per-Diem</h1>
      <small>Generated ${new Date().toLocaleString('en-UG')} • ${records.length} record(s)</small>
      <table><thead><tr>
        <th>Date</th><th>Recipient</th><th>NIN</th><th>Phone</th><th>Description</th>
        <th>Amount</th><th>Total</th><th>Method</th><th>Status</th><th>Initiated By</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=1024,height=768');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <Card className="card-modern">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Support Staff Per-Diem</CardTitle>
            <p className="text-sm text-muted-foreground">Pay hired (non-employee) support staff their per-diem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={records.length === 0} className="gap-1">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Send className="w-4 h-4" /> Pay Per-Diem</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Pay Support Staff Per-Diem</DialogTitle>
                <DialogDescription>Enter details and choose payment method.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm(f => ({ ...f, paymentMethod: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money"><span className="inline-flex items-center gap-2"><Smartphone className="w-3 h-3" /> Mobile Money (Yo)</span></SelectItem>
                      <SelectItem value="cash"><span className="inline-flex items-center gap-2"><Banknote className="w-3 h-3" /> Cash (Finance pays out)</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recipient Name *</Label>
                  <Input value={form.receiverName} onChange={(e) => setForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Full name" maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>National ID (NIN)</Label>
                    <Input value={form.nationalId} onChange={(e) => setForm(f => ({ ...f, nationalId: e.target.value }))} placeholder="CM/CF..." maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone {form.paymentMethod === 'mobile_money' && '*'}</Label>
                    <Input value={form.receiverPhone} onChange={(e) => setForm(f => ({ ...f, receiverPhone: e.target.value }))} placeholder="0770..." maxLength={15} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason / Description *</Label>
                  <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 3 days field support, 22-24 June" rows={3} maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount (UGX) *</Label>
                    <Input type="number" min={500} value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="45000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Withdraw Charge (UGX)</Label>
                    <Input type="number" value={form.withdrawCharge} onChange={(e) => setForm(f => ({ ...f, withdrawCharge: e.target.value }))} placeholder="0" disabled={form.paymentMethod === 'cash'} />
                  </div>
                </div>
                {form.amount && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between"><span>Per-Diem:</span><span>UGX {Number(form.amount || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Charge:</span><span>UGX {Number(form.paymentMethod === 'cash' ? 0 : (form.withdrawCharge || 0)).toLocaleString()}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>Total to Pay:</span>
                      <span>UGX {(Number(form.amount || 0) + Number(form.paymentMethod === 'cash' ? 0 : (form.withdrawCharge || 0))).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2 w-full sm:w-auto">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Processing...' : form.paymentMethod === 'cash' ? 'Record Cash Payout' : 'Send via MoMo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : records.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No support staff per-diem records yet</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <p className="text-sm text-muted-foreground">Most recent payments</p>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filter by name, NIN, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>NIN</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell className="font-medium">{d.receiver_name}</TableCell>
                    <TableCell className="text-sm">{d.national_id || '—'}</TableCell>
                    <TableCell className="text-sm">{d.receiver_phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{d.description}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatAmount(d.total_amount)}</TableCell>
                    <TableCell className="text-sm">{d.payment_method === 'cash' ? 'Cash' : 'MoMo'}</TableCell>
                    <TableCell>{getStatusBadge(d.yo_status, d.payment_method)}</TableCell>
                    <TableCell className="text-sm">{d.initiated_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {records.length > 5 && !term && (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                Showing 5 of {records.length} — use search to find more
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupportStaffPerDiemSection;