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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Truck, PackageCheck } from 'lucide-react';

export default function V3Logistics() {
  const { hasRole } = useV3Roles();
  const canMove = hasRole('logistics_manager', 'store_manager', 'branch_manager');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: transfers = [] } = useQuery({
    queryKey: ['v3-transfers'],
    queryFn: async () => (await supabase.from('v3_transfers').select('*, from:v3_branches!v3_transfers_from_branch_id_fkey(name), to:v3_branches!v3_transfers_to_branch_id_fkey(name)').order('created_at', { ascending: false })).data as any[] || [],
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['v3-transferable-batches'],
    queryFn: async () => (await supabase.from('v3_stock_batches').select('id, batch_number, coffee_type, available_kilograms, bags').gt('available_kilograms', 0)).data as any[] || [],
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['v3-branches'],
    queryFn: async () => (await supabase.from('v3_branches').select('id, name').eq('active', true)).data as any[] || [],
  });

  const dispatch = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('v3_dispatch_transfer', {
        p_batch_id: form.batch_id,
        p_to_branch_id: form.to_branch_id,
        p_bags: Number(form.bags || 0),
        p_kg: Number(form.kg || 0),
        p_vehicle: form.vehicle || null,
        p_driver: form.driver || null,
        p_seal: form.seal || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({ title: `Transfer ${d.transfer_number} dispatched` });
      setOpen(false); setForm({});
      qc.invalidateQueries({ queryKey: ['v3-transfers'] });
      qc.invalidateQueries({ queryKey: ['v3-transferable-batches'] });
      qc.invalidateQueries({ queryKey: ['v3-stock'] });
    },
    onError: (e: any) => toast({ title: 'Dispatch failed', description: e.message, variant: 'destructive' }),
  });

  const receive = useMutation({
    mutationFn: async ({ id, kg, seal }: { id: string; kg: number; seal: boolean }) => {
      const { data, error } = await (supabase.rpc as any)('v3_receive_transfer', {
        p_transfer_id: id, p_arrival_weight: kg, p_seal_intact: seal, p_notes: null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({
        title: d.status === 'received_with_variance' ? 'Received with variance' : 'Transfer received',
        description: `Variance ${d.variance_kg} kg · batch ${d.batch_number} created in the main store.`,
        variant: d.status === 'received_with_variance' ? 'destructive' : undefined,
      });
      qc.invalidateQueries({ queryKey: ['v3-transfers'] });
      qc.invalidateQueries({ queryKey: ['v3-stock'] });
    },
    onError: (e: any) => toast({ title: 'Could not receive transfer', description: e.message, variant: 'destructive' }),
  });

  const selected = batches.find((b: any) => b.id === form.batch_id);

  return (
    <V3Layout
      title="Transport & Logistics"
      description="Transfer notes, trips, seals and arrival verification"
      actions={canMove && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Truck className="h-4 w-4 mr-1" /> Dispatch stock</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Dispatch transfer</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Batch</Label>
                <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_number} · {b.coffee_type} · {Number(b.available_kilograms).toLocaleString()} kg</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected && <p className="text-xs text-muted-foreground mt-1">Available: {Number(selected.available_kilograms).toLocaleString()} kg</p>}
              </div>
              <div className="sm:col-span-2">
                <Label>Destination store</Label>
                <Select value={form.to_branch_id} onValueChange={(v) => setForm({ ...form, to_branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bags</Label><Input type="number" value={form.bags || ''} onChange={(e) => setForm({ ...form, bags: e.target.value })} /></div>
              <div><Label>Dispatch kg</Label><Input type="number" value={form.kg || ''} onChange={(e) => setForm({ ...form, kg: e.target.value })} /></div>
              <div><Label>Vehicle</Label><Input value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
              <div><Label>Driver</Label><Input value={form.driver || ''} onChange={(e) => setForm({ ...form, driver: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Seal number</Label><Input value={form.seal || ''} onChange={(e) => setForm({ ...form, seal: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => dispatch.mutate()} disabled={dispatch.isPending || !form.batch_id || !form.to_branch_id || !form.kg}>Dispatch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Transfer notes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Transfer</TableHead><TableHead>Route</TableHead><TableHead>Driver</TableHead>
              <TableHead>Seal</TableHead><TableHead>Dispatch kg</TableHead><TableHead>Arrival kg</TableHead>
              <TableHead>Variance</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {transfers.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No transfers recorded.</TableCell></TableRow>}
              {transfers.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.transfer_number}</TableCell>
                  <TableCell className="text-xs">{t.from?.name || '—'} → {t.to?.name || '—'}</TableCell>
                  <TableCell>{t.driver_name || '—'}</TableCell>
                  <TableCell>{t.seal_number || '—'}</TableCell>
                  <TableCell className="tabular-nums">{Number(t.dispatch_weight || 0).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{Number(t.arrival_weight || 0).toLocaleString()}</TableCell>
                  <TableCell className={Number(t.variance_kg || 0) !== 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>{Number(t.variance_kg || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canMove && ['dispatched', 'in_transit', 'arrived', 'under_verification'].includes(t.status) && (
                      <Button size="sm" variant="outline" disabled={receive.isPending} onClick={() => {
                        const input = window.prompt('Arrival weight (kg)', String(t.dispatch_weight ?? ''));
                        if (input === null) return;
                        const kg = Number(input);
                        if (!kg || kg <= 0) { toast({ title: 'Enter a valid arrival weight', variant: 'destructive' }); return; }
                        const seal = window.confirm('Was the seal intact on arrival? OK = yes, Cancel = no');
                        receive.mutate({ id: t.id, kg, seal });
                      }}>
                        <PackageCheck className="h-4 w-4 mr-1" /> Receive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}