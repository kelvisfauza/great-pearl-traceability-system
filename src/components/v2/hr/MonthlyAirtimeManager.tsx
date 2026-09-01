import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, CheckCircle2, Send, RefreshCw, History } from 'lucide-react';

interface Batch {
  id: string;
  month_year: string;
  title: string;
  status: string;
  total_amount: number;
  recipient_count: number;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Item {
  id: string;
  batch_id: string;
  employee_email: string;
  employee_name: string;
  phone: string;
  department: string | null;
  tier: string;
  amount: number;
  included: boolean;
  payment_status: string;
  yo_reference: string | null;
  error_message: string | null;
  paid_at: string | null;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'approved':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
    case 'pending_approval':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'partial':
      return 'bg-orange-100 text-orange-800';
    case 'skipped':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const MonthlyAirtimeManager = () => {
  const { employee } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newMonth, setNewMonth] = useState(currentMonth());

  const selected = useMemo(() => batches.find((b) => b.id === selectedId) || null, [batches, selectedId]);
  const editable = selected?.status === 'draft';

  const includedItems = useMemo(() => items.filter((i) => i.included), [items]);
  const total = useMemo(() => includedItems.reduce((s, i) => s + Number(i.amount || 0), 0), [includedItems]);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('airtime_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    const list = (data || []) as Batch[];
    setBatches(list);
    setSelectedId((prev) => prev || list[0]?.id || '');
    setLoading(false);
  }, []);

  const loadItems = useCallback(async (batchId: string) => {
    if (!batchId) { setItems([]); return; }
    const { data, error } = await supabase
      .from('airtime_batch_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('tier', { ascending: true })
      .order('employee_name', { ascending: true });
    if (error) toast.error(error.message);
    setItems((data || []) as Item[]);
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadItems(selectedId); }, [selectedId, loadItems]);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('hr-airtime-batch', {
      body: { ...payload, actor: employee?.email || 'admin' },
    });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || 'Request failed');
    return data;
  };

  const createDraft = async () => {
    setBusy(true);
    try {
      const res = await call({ action: 'create_draft', monthYear: newMonth });
      toast.success(`Draft created with ${res.recipients} recipients`);
      await loadBatches();
      setSelectedId(res.batchId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const updateItem = async (id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } as Item : i)));
    const { error } = await supabase.from('airtime_batch_items').update(patch).eq('id', id);
    if (error) { toast.error(error.message); loadItems(selectedId); }
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await call({ action: 'approve', batchId: selected.id });
      toast.success(`Approved — ${res.recipients} recipients ready to disburse`);
      await loadBatches();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const disburse = async () => {
    if (!selected) return;
    if (!confirm(`Send airtime to ${includedItems.length} recipients (UGX ${total.toLocaleString()}) via Yo Payments?`)) return;
    setBusy(true);
    try {
      const res = await call({ action: 'disburse', batchId: selected.id });
      toast.success(`Disbursed: ${res.sent} sent, ${res.failed} failed`);
      await loadBatches();
      await loadItems(selected.id);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Tabs defaultValue="manage" className="space-y-6">
      <TabsList>
        <TabsTrigger value="manage">Manage Airtime</TabsTrigger>
        <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History &amp; Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="manage" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Airtime Batch</CardTitle>
            <CardDescription>
              Review and edit amounts, then approve to trigger Yo Payments disbursement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Existing batch</p>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.month_year} — {b.status} (UGX {Number(b.total_amount).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">New month</p>
                <Input type="month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="w-40" />
              </div>
              <Button onClick={createDraft} disabled={busy}>
                <Plus className="h-4 w-4 mr-2" />Create draft
              </Button>
              <Button variant="outline" onClick={() => { loadBatches(); loadItems(selectedId); }} disabled={busy}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {selected && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                <Badge className={statusVariant(selected.status)}>{selected.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {includedItems.length} recipients • <span className="font-semibold text-foreground">UGX {total.toLocaleString()}</span>
                </span>
                <div className="ml-auto flex gap-2">
                  <Button onClick={approve} disabled={busy || selected.status !== 'draft'}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />Approve
                  </Button>
                  <Button
                    onClick={disburse}
                    disabled={busy || !['approved', 'partial'].includes(selected.status)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send via Yo Payments
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>
              {editable ? 'Untick anyone who should not receive airtime and adjust amounts.' : 'This batch is locked — amounts can only be edited while in draft.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recipients. Create a draft for the month.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Pay</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Amount (UGX)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Yo Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className={item.included ? '' : 'opacity-50'}>
                        <TableCell>
                          <Checkbox
                            checked={item.included}
                            disabled={!editable}
                            onCheckedChange={(v) => updateItem(item.id, { included: !!v })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{item.department || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{item.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.tier}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-28"
                            value={item.amount}
                            disabled={!editable}
                            onChange={(e) => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, amount: Number(e.target.value) } : i))}
                            onBlur={(e) => updateItem(item.id, { amount: Number(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={statusVariant(item.payment_status)}>{item.payment_status}</Badge>
                          {item.error_message && (
                            <p className="text-xs text-red-600 mt-1 max-w-[180px]">{item.error_message}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.yo_reference || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Airtime History</CardTitle>
            <CardDescription>Every monthly batch with approval and disbursement logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Approved by</TableHead>
                    <TableHead>Sent at</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => setSelectedId(b.id)}>
                      <TableCell className="font-medium">{b.month_year}</TableCell>
                      <TableCell><Badge className={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                      <TableCell>{b.recipient_count}</TableCell>
                      <TableCell>UGX {Number(b.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{b.approved_by || '—'}</TableCell>
                      <TableCell className="text-sm">{b.sent_at ? new Date(b.sent_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {batches.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No batches yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default MonthlyAirtimeManager;
