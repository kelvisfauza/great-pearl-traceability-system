import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Printer, Loader2, Plus, BookOpen, CheckCircle2, Ban, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { openFuelVoucherPdf, type FuelVoucherPayload } from '@/utils/fuelVoucherPdf';

interface FuelVoucher {
  id: string;
  voucher_number: string;
  kind: 'trip' | 'book';
  status: 'issued' | 'used' | 'cancelled';
  truck_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  service_provider: string | null;
  fuel_type: string;
  route: string | null;
  purpose: string | null;
  notes: string | null;
  batch_reference: string | null;
  issued_by_name: string | null;
  issued_by_email: string | null;
  used_at: string | null;
  used_litres: number | null;
  used_amount: number | null;
  used_provider: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusBadge = (status: string) => {
  if (status === 'used') return <Badge variant="secondary">Used</Badge>;
  if (status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge>Issued</Badge>;
};

export const FuelVouchersManager: React.FC = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newOpen, setNewOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [useTarget, setUseTarget] = useState<FuelVoucher | null>(null);
  const [cancelTarget, setCancelTarget] = useState<FuelVoucher | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [truckFilter, setTruckFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    truck_number: '', driver_name: '', driver_phone: '', service_provider: '',
    fuel_type: 'Diesel', route: '', purpose: '', notes: '',
  });
  const [bookCount, setBookCount] = useState(10);
  const [useForm, setUseForm] = useState({ litres: '', amount: '', provider: '' });
  const [cancelReason, setCancelReason] = useState('');

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['fuel-vouchers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_vouchers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as FuelVoucher[];
    },
  });

  const trucks = useMemo(() => {
    const set = new Set<string>();
    vouchers?.forEach(v => v.truck_number && set.add(v.truck_number));
    return Array.from(set).sort();
  }, [vouchers]);

  const filtered = useMemo(() => {
    return (vouchers || []).filter(v => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (truckFilter !== 'all' && v.truck_number !== truckFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [v.voucher_number, v.truck_number, v.driver_name, v.service_provider, v.route]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vouchers, statusFilter, truckFilter, search]);

  const stats = useMemo(() => {
    const all = vouchers || [];
    const issued = all.filter(v => v.status === 'issued').length;
    const used = all.filter(v => v.status === 'used');
    const cancelled = all.filter(v => v.status === 'cancelled').length;
    const totalSpent = used.reduce((s, v) => s + Number(v.used_amount || 0), 0);
    return { total: all.length, issued, used: used.length, cancelled, totalSpent };
  }, [vouchers]);

  const truckTotals = useMemo(() => {
    const map = new Map<string, { vouchers: number; litres: number; amount: number }>();
    (vouchers || []).filter(v => v.status === 'used' && v.truck_number).forEach(v => {
      const t = map.get(v.truck_number!) || { vouchers: 0, litres: 0, amount: 0 };
      t.vouchers += 1;
      t.litres += Number(v.used_litres || 0);
      t.amount += Number(v.used_amount || 0);
      map.set(v.truck_number!, t);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].amount - a[1].amount);
  }, [vouchers]);

  const issueTripVoucher = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_vouchers')
        .insert({
          kind: 'trip',
          truck_number: form.truck_number || null,
          driver_name: form.driver_name || null,
          driver_phone: form.driver_phone || null,
          service_provider: form.service_provider || null,
          fuel_type: form.fuel_type,
          route: form.route || null,
          purpose: form.purpose || null,
          notes: form.notes || null,
          issued_by_name: employee?.name || null,
          issued_by_email: employee?.email || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FuelVoucher;
    },
    onSuccess: async (v) => {
      queryClient.invalidateQueries({ queryKey: ['fuel-vouchers'] });
      setNewOpen(false);
      setForm({ truck_number: '', driver_name: '', driver_phone: '', service_provider: '', fuel_type: 'Diesel', route: '', purpose: '', notes: '' });
      toast({ title: 'Voucher issued', description: v.voucher_number });
      await printVouchers([v]);
    },
    onError: (e: any) => toast({ title: 'Failed to issue voucher', description: e.message, variant: 'destructive' }),
  });

  const printBookBatch = useMutation({
    mutationFn: async () => {
      const batchRef = `BOOK-${Date.now().toString(36).toUpperCase()}`;
      const rows = Array.from({ length: bookCount }, () => ({
        kind: 'book',
        fuel_type: 'Diesel',
        batch_reference: batchRef,
        issued_by_name: employee?.name || null,
        issued_by_email: employee?.email || null,
      }));
      const { data, error } = await (supabase as any)
        .from('fuel_vouchers')
        .insert(rows)
        .select();
      if (error) throw error;
      return (data as FuelVoucher[]).sort((a, b) => a.voucher_number.localeCompare(b.voucher_number));
    },
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ['fuel-vouchers'] });
      setBookOpen(false);
      toast({ title: 'Voucher book created', description: `${created.length} vouchers, ${created[0].voucher_number} – ${created[created.length - 1].voucher_number}` });
      await printVouchers(created);
    },
    onError: (e: any) => toast({ title: 'Failed to create book', description: e.message, variant: 'destructive' }),
  });

  const markUsed = useMutation({
    mutationFn: async () => {
      if (!useTarget) return;
      const { error } = await (supabase as any)
        .from('fuel_vouchers')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_litres: useForm.litres ? parseFloat(useForm.litres) : null,
          used_amount: useForm.amount ? parseFloat(useForm.amount) : null,
          used_provider: useForm.provider || useTarget.service_provider || null,
        })
        .eq('id', useTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-vouchers'] });
      setUseTarget(null);
      setUseForm({ litres: '', amount: '', provider: '' });
      toast({ title: 'Voucher marked as used' });
    },
    onError: (e: any) => toast({ title: 'Failed to update', description: e.message, variant: 'destructive' }),
  });

  const cancelVoucher = useMutation({
    mutationFn: async () => {
      if (!cancelTarget) return;
      const { error } = await (supabase as any)
        .from('fuel_vouchers')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: cancelReason || null,
        })
        .eq('id', cancelTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-vouchers'] });
      setCancelTarget(null);
      setCancelReason('');
      toast({ title: 'Voucher cancelled' });
    },
    onError: (e: any) => toast({ title: 'Failed to cancel', description: e.message, variant: 'destructive' }),
  });

  const printVouchers = async (list: FuelVoucher[]) => {
    const payloads: FuelVoucherPayload[] = list.map(v => ({
      voucherNumber: v.voucher_number,
      kind: v.kind,
      date: v.created_at || todayISO(),
      truckNumber: v.truck_number || undefined,
      driverName: v.driver_name || undefined,
      driverPhone: v.driver_phone || undefined,
      serviceProvider: v.service_provider || undefined,
      fuelType: v.fuel_type,
      route: v.route || undefined,
      purpose: v.purpose || undefined,
      notes: v.notes || undefined,
      issuedBy: v.issued_by_name || employee?.name || '',
    }));
    await openFuelVoucherPdf(payloads);
  };

  const reprint = async (v: FuelVoucher) => {
    try {
      await printVouchers([v]);
    } catch (e: any) {
      toast({ title: 'Print failed', description: e?.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Issued (open)</p><p className="text-xl font-bold">{stats.issued}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Used</p><p className="text-xl font-bold">{stats.used}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Cancelled</p><p className="text-xl font-bold">{stats.cancelled}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-xl font-bold">UGX {stats.totalSpent.toLocaleString()}</p></CardContent></Card>
      </div>

      {/* Actions + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New Trip Voucher</Button>
        <Button variant="outline" onClick={() => setBookOpen(true)}><BookOpen className="h-4 w-4 mr-1" />Print Voucher Book</Button>
        <div className="flex-1" />
        <Input placeholder="Search number, truck, driver…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All trucks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trucks</SelectItem>
            {trucks.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Register */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount (UGX)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.voucher_number}</TableCell>
                  <TableCell>{v.kind === 'book' ? 'Book' : 'Trip'}</TableCell>
                  <TableCell>{v.truck_number || '—'}</TableCell>
                  <TableCell>{v.driver_name || '—'}</TableCell>
                  <TableCell>{v.used_provider || v.service_provider || '—'}</TableCell>
                  <TableCell>{format(new Date(v.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{statusBadge(v.status)}</TableCell>
                  <TableCell>{v.used_amount ? Number(v.used_amount).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => reprint(v)} title="Reprint">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {v.status === 'issued' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setUseTarget(v); setUseForm({ litres: '', amount: '', provider: v.service_provider || '' }); }} title="Mark used">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelTarget(v)} title="Cancel">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No vouchers match</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-truck spending */}
      {truckTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" />Fuel Spending per Truck</CardTitle>
            <CardDescription>Based on vouchers marked as used</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck</TableHead>
                  <TableHead>Vouchers Used</TableHead>
                  <TableHead>Litres</TableHead>
                  <TableHead>Total (UGX)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {truckTotals.map(([truck, t]) => (
                  <TableRow key={truck}>
                    <TableCell className="font-medium">{truck}</TableCell>
                    <TableCell>{t.vouchers}</TableCell>
                    <TableCell>{t.litres.toLocaleString()}</TableCell>
                    <TableCell>{t.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New trip voucher dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" />New Trip Fuel Voucher</DialogTitle>
            <DialogDescription>A numbered A4 voucher for a specific truck and trip. The station fills in litres and the amount owed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Truck / Vehicle No. *</Label><Input placeholder="UAX 123A" value={form.truck_number} onChange={e => setForm(p => ({ ...p, truck_number: e.target.value }))} /></div>
              <div><Label>Driver Name *</Label><Input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Driver Phone</Label><Input value={form.driver_phone} onChange={e => setForm(p => ({ ...p, driver_phone: e.target.value }))} /></div>
              <div><Label>Service Provider</Label><Input placeholder="e.g. Shell Kasese" value={form.service_provider} onChange={e => setForm(p => ({ ...p, service_provider: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fuel Type</Label>
                <Select value={form.fuel_type} onValueChange={v => setForm(p => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Route / Destination</Label><Input placeholder="e.g. Kasese → Kampala" value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))} /></div>
            </div>
            <div><Label>Purpose</Label><Input placeholder="e.g. Coffee delivery trip" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!form.truck_number.trim() || !form.driver_name.trim()) {
                  toast({ title: 'Missing fields', description: 'Truck number and driver name are required.', variant: 'destructive' });
                  return;
                }
                issueTripVoucher.mutate();
              }}
              disabled={issueTripVoucher.isPending}
            >
              {issueTripVoucher.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Issue & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book batch dialog */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Print Voucher Book</DialogTitle>
            <DialogDescription>Creates a batch of pre-numbered blank vouchers (one A4 page each). Staff fill in truck and driver by hand; the station fills in litres and amount.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Number of vouchers</Label>
            <Input type="number" min={1} max={50} value={bookCount} onChange={e => setBookCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={() => printBookBatch.mutate()} disabled={printBookBatch.isPending}>
              {printBookBatch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Create & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark used dialog */}
      <Dialog open={!!useTarget} onOpenChange={(o) => !o && setUseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Voucher Used — {useTarget?.voucher_number}</DialogTitle>
            <DialogDescription>Enter what the station filled in on the printed voucher.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Litres</Label><Input type="number" value={useForm.litres} onChange={e => setUseForm(p => ({ ...p, litres: e.target.value }))} /></div>
              <div><Label>Total Amount (UGX) *</Label><Input type="number" value={useForm.amount} onChange={e => setUseForm(p => ({ ...p, amount: e.target.value }))} /></div>
            </div>
            <div><Label>Station / Provider</Label><Input value={useForm.provider} onChange={e => setUseForm(p => ({ ...p, provider: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!useForm.amount) {
                  toast({ title: 'Amount required', variant: 'destructive' });
                  return;
                }
                markUsed.mutate();
              }}
              disabled={markUsed.isPending}
            >
              {markUsed.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Voucher — {cancelTarget?.voucher_number}</DialogTitle>
            <DialogDescription>Cancelled vouchers stay in the register but cannot be used.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Reason</Label>
            <Input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. Damaged, lost, issued in error" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Back</Button>
            <Button variant="destructive" onClick={() => cancelVoucher.mutate()} disabled={cancelVoucher.isPending}>
              {cancelVoucher.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelVouchersManager;
