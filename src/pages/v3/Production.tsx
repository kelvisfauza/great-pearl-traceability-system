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
import { Factory, CheckCircle2 } from 'lucide-react';

export default function V3Production() {
  const { hasRole } = useV3Roles();
  const canRun = hasRole('production_manager', 'production_operator');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [finishing, setFinishing] = useState<any | null>(null);
  const [out, setOut] = useState<Record<string, string>>({});

  const { data: runs = [] } = useQuery({
    queryKey: ['v3-production'],
    queryFn: async () => (await supabase.from('v3_production_runs').select('*').order('created_at', { ascending: false })).data as any[] || [],
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['v3-production-batches'],
    queryFn: async () => (await supabase.from('v3_stock_batches').select('id, batch_number, coffee_type, available_kilograms').gt('available_kilograms', 0)).data as any[] || [],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['v3-production'] });
    qc.invalidateQueries({ queryKey: ['v3-production-batches'] });
    qc.invalidateQueries({ queryKey: ['v3-stock'] });
  };

  const start = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('v3_start_production_run', {
        p_batch_id: form.batch_id,
        p_input_kg: Number(form.input_kg || 0),
        p_machine: form.machine || null,
        p_method: form.method || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => { toast({ title: `Run ${d.run_number} started` }); setOpen(false); setForm({}); invalidate(); },
    onError: (e: any) => toast({ title: 'Could not start run', description: e.message, variant: 'destructive' }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('v3_complete_production_run', {
        p_run_id: finishing.id,
        p_exportable: Number(out.exportable || 0),
        p_black: Number(out.black || 0),
        p_triage: Number(out.triage || 0),
        p_husks: Number(out.husks || 0),
        p_pods: Number(out.pods || 0),
        p_dust: Number(out.dust || 0),
        p_moisture_loss: Number(out.moisture || 0),
        p_grade: out.grade || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({
        title: d.status === 'variance_review' ? 'Held for variance investigation' : 'Run completed',
        description: `Variance ${d.variance_kg} kg · processed batch ${d.batch_number} created.`,
        variant: d.status === 'variance_review' ? 'destructive' : undefined,
      });
      setFinishing(null); setOut({}); invalidate();
    },
    onError: (e: any) => toast({ title: 'Could not complete run', description: e.message, variant: 'destructive' }),
  });

  const outTotal = ['exportable','black','triage','husks','pods','dust','moisture']
    .reduce((a, k) => a + Number(out[k] || 0), 0);

  return (
    <V3Layout
      title="Production"
      description="Batch processing, outputs, yields and variance control"
      actions={canRun && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Factory className="h-4 w-4 mr-1" /> Start run</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Start production run</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Input batch</Label>
                <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_number} · {b.coffee_type} · {Number(b.available_kilograms).toLocaleString()} kg</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Input kg</Label><Input type="number" value={form.input_kg || ''} onChange={(e) => setForm({ ...form, input_kg: e.target.value })} /></div>
              <div><Label>Machine</Label><Input value={form.machine || ''} onChange={(e) => setForm({ ...form, machine: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Processing method</Label><Input value={form.method || ''} onChange={(e) => setForm({ ...form, method: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => start.mutate()} disabled={start.isPending || !form.batch_id || !form.input_kg}>Start run</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Production runs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Run</TableHead><TableHead>Machine</TableHead><TableHead>Input kg</TableHead>
              <TableHead>Exportable</TableHead><TableHead>By-products</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {runs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No production runs recorded.</TableCell></TableRow>}
              {runs.map((r: any) => {
                const by = ['output_black_kg','output_triage_kg','output_husks_kg','output_pods_kg','output_dust_kg']
                  .reduce((a, k) => a + Number(r[k] || 0), 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.run_number}</TableCell>
                    <TableCell>{r.machine || '—'}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.input_kg).toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.output_exportable_kg || 0).toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{by.toLocaleString()}</TableCell>
                    <TableCell className={Number(r.variance_kg || 0) !== 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>{Number(r.variance_kg || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={r.status === 'variance_review' ? 'destructive' : 'outline'}>{r.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canRun && r.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => { setFinishing(r); setOut({}); }}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!finishing} onOpenChange={(o) => !o && setFinishing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Complete run {finishing?.run_number}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Exportable kg</Label><Input type="number" value={out.exportable || ''} onChange={(e) => setOut({ ...out, exportable: e.target.value })} /></div>
            <div><Label>Grade</Label><Input value={out.grade || ''} onChange={(e) => setOut({ ...out, grade: e.target.value })} /></div>
            <div><Label>Black kg</Label><Input type="number" value={out.black || ''} onChange={(e) => setOut({ ...out, black: e.target.value })} /></div>
            <div><Label>Triage kg</Label><Input type="number" value={out.triage || ''} onChange={(e) => setOut({ ...out, triage: e.target.value })} /></div>
            <div><Label>Husks kg</Label><Input type="number" value={out.husks || ''} onChange={(e) => setOut({ ...out, husks: e.target.value })} /></div>
            <div><Label>Pods kg</Label><Input type="number" value={out.pods || ''} onChange={(e) => setOut({ ...out, pods: e.target.value })} /></div>
            <div><Label>Dust kg</Label><Input type="number" value={out.dust || ''} onChange={(e) => setOut({ ...out, dust: e.target.value })} /></div>
            <div><Label>Moisture loss kg</Label><Input type="number" value={out.moisture || ''} onChange={(e) => setOut({ ...out, moisture: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Accounted: {outTotal.toLocaleString()} kg of {Number(finishing?.input_kg || 0).toLocaleString()} kg input ·
            variance {(outTotal - Number(finishing?.input_kg || 0)).toLocaleString()} kg. Over 2% is held for investigation.
          </p>
          <DialogFooter><Button onClick={() => complete.mutate()} disabled={complete.isPending || !out.exportable}>Complete run</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </V3Layout>
  );
}