import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Plus, CheckCircle2 } from 'lucide-react';

export default function V3Receiving() {
  const { hasRole } = useV3Roles();
  const canCapture = hasRole('storekeeper', 'store_manager', 'branch_manager');
  const canApprove = hasRole('store_manager', 'branch_manager');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ workflow: 'quality_first', coffee_type: 'Arabica' });

  const { data: records = [] } = useQuery({
    queryKey: ['v3-receiving'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v3_receiving_records')
        .select('*, v3_suppliers(name, code), v3_branches(name)')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['v3-suppliers'],
    queryFn: async () => (await supabase.from('v3_suppliers').select('id,code,name').eq('active', true)).data || [],
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['v3-branches'],
    queryFn: async () => (await supabase.from('v3_branches').select('id,name,code').eq('active', true)).data || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const seq = Date.now().toString().slice(-6);
      const { error } = await supabase.from('v3_receiving_records').insert({
        receiving_number: `YEDA-RCV-${seq}`,
        sample_code: `S-${seq}`,
        branch_id: form.branch_id || null,
        supplier_id: form.supplier_id || null,
        workflow: form.workflow,
        coffee_type: form.coffee_type,
        processing_type: form.processing_type || null,
        bags: Number(form.bags || 0),
        vehicle: form.vehicle || null,
        driver_name: form.driver_name || null,
        status: form.workflow === 'quality_first' ? 'awaiting_quality' : 'draft',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Receiving record created', description: 'A blind sample code has been issued.' });
      setOpen(false); setForm({ workflow: 'quality_first', coffee_type: 'Arabica' });
      qc.invalidateQueries({ queryKey: ['v3-receiving'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, any> }) => {
      const { error } = await (supabase.from('v3_receiving_records') as any).update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-receiving'] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <V3Layout
      title="Coffee Receiving"
      description="Quality-first and weigh-first delivery capture with blind sample codes"
      actions={canCapture && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New delivery</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create receiving record</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Workflow</Label>
                <Select value={form.workflow} onValueChange={(v) => setForm({ ...form, workflow: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality_first">A — Quality first</SelectItem>
                    <SelectItem value="weigh_first">B — Weigh first (large deliveries)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Coffee type</Label><Input value={form.coffee_type || ''} onChange={(e) => setForm({ ...form, coffee_type: e.target.value })} /></div>
              <div><Label>Processing type</Label><Input value={form.processing_type || ''} onChange={(e) => setForm({ ...form, processing_type: e.target.value })} /></div>
              <div><Label>Bags</Label><Input type="number" value={form.bags || ''} onChange={(e) => setForm({ ...form, bags: e.target.value })} /></div>
              <div><Label>Vehicle</Label><Input value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Create record</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Deliveries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receiving</TableHead><TableHead>Sample</TableHead><TableHead>Supplier</TableHead>
                <TableHead>Coffee</TableHead><TableHead>Bags</TableHead><TableHead>Net kg</TableHead>
                <TableHead>Status</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No deliveries recorded.</TableCell></TableRow>}
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.receiving_number}</TableCell>
                  <TableCell><Badge variant="secondary">{r.sample_code}</Badge></TableCell>
                  <TableCell>{r.status === 'awaiting_quality' ? <span className="text-muted-foreground italic">hidden</span> : (r.v3_suppliers?.name || '—')}</TableCell>
                  <TableCell>{r.coffee_type}</TableCell>
                  <TableCell className="tabular-nums">{r.bags}</TableCell>
                  <TableCell className="tabular-nums">
                    <Input className="h-8 w-24" type="number" defaultValue={r.net_weight ?? ''} disabled={!canCapture}
                      onBlur={(e) => Number(e.target.value) !== Number(r.net_weight ?? 0) && patch.mutate({ id: r.id, values: { net_weight: Number(e.target.value), status: 'weighed' } })} />
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canApprove && r.status === 'awaiting_approval' && (
                      <Button size="sm" variant="outline" onClick={async () => patch.mutate({
                        id: r.id,
                        values: { status: 'approved', approved_by: (await supabase.auth.getUser()).data.user?.id, approved_at: new Date().toISOString() },
                      })}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
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