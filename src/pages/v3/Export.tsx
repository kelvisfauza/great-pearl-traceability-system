import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Ship, Plus, FileCheck2, Lock, ContainerIcon } from 'lucide-react';

const SHIPMENT_STATUSES = ['planned','allocated','processing','documents_pending','ready_to_load','loaded','customs','shipped','delivered','closed','cancelled'] as const;

export const REQUIRED_DOCS = [
  'Commercial Invoice','Packing List','Certificate of Origin','Quality/Weight Certificate',
  'Fumigation/Phytosanitary','Customs Declaration','Bill of Lading','EUDR/Traceability Package','Insurance Certificate',
];

export default function V3Export() {
  const { hasRole } = useV3Roles();
  const canEdit = hasRole('export_manager', 'export_officer');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ coffee_type: 'Arabica' });
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadForm, setLoadForm] = useState<Record<string, string>>({});

  const { data: shipments = [] } = useQuery({
    queryKey: ['v3-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v3_export_shipments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['v3-contracts-min'],
    queryFn: async () => {
      const { data } = await supabase.from('v3_contracts').select('id,contract_number,counterparty_name').eq('status', 'active');
      return data || [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['v3-shipment-docs', selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from('v3_export_documents').select('*').eq('shipment_id', selected!).order('document_type');
      return data || [];
    },
  });

  const createShipment = useMutation({
    mutationFn: async () => {
      const number = `YEDA-SHP-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase.from('v3_export_shipments').insert({
        shipment_number: number,
        contract_id: form.contract_id || null,
        coffee_type: form.coffee_type || null,
        grade: form.grade || null,
        planned_kg: Number(form.planned_kg || 0),
        bags: Number(form.bags || 0),
        destination_country: form.destination_country || null,
        port_of_loading: form.port_of_loading || 'Mombasa',
        port_of_discharge: form.port_of_discharge || null,
        etd: form.etd || null,
        notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error;
      await supabase.from('v3_export_documents').insert(
        REQUIRED_DOCS.map((d) => ({ shipment_id: data.id, document_type: d, mandatory: d !== 'Insurance Certificate' })),
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Shipment file created', description: 'Document checklist generated.' });
      setOpenNew(false); setForm({ coffee_type: 'Arabica' });
      qc.invalidateQueries({ queryKey: ['v3-shipments'] });
    },
    onError: (e: any) => toast({ title: 'Could not create shipment', description: e.message, variant: 'destructive' }),
  });

  const updateShipment = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase.from("v3_export_shipments") as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-shipments'] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const updateDoc = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase.from("v3_export_documents") as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-shipment-docs', selected] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const current = shipments.find((s: any) => s.id === selected);
  const outstanding = docs.filter((d: any) => d.mandatory && d.status !== 'approved');
  const loadingBlocked = !current?.quality_approved || outstanding.length > 0;

  const loadShipment = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('v3_load_shipment', {
        p_shipment_id: current.id,
        p_loaded_kg: Number(loadForm.loaded_kg || 0),
        p_bags: loadForm.bags ? Number(loadForm.bags) : null,
        p_container: loadForm.container || current.container_number || null,
        p_seal: loadForm.seal || current.seal_number || null,
        p_tare_kg: loadForm.tare ? Number(loadForm.tare) : null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({ title: `${d.shipment_number} loaded`, description: `${Number(d.loaded_kg).toLocaleString()} kg recorded against the contract.` });
      setLoadOpen(false); setLoadForm({});
      qc.invalidateQueries({ queryKey: ['v3-shipments'] });
      qc.invalidateQueries({ queryKey: ['v3-contracts'] });
    },
    onError: (e: any) => toast({ title: 'Loading failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <V3Layout
      title="Export Management"
      description="Shipment files, containers, customs and export documentation"
      actions={canEdit && (
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New shipment</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create shipment file</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Buyer contract</Label>
                <Select value={form.contract_id} onValueChange={(v) => setForm({ ...form, contract_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                  <SelectContent>
                    {contracts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_number} — {c.counterparty_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Coffee type</Label><Input value={form.coffee_type || ''} onChange={(e) => setForm({ ...form, coffee_type: e.target.value })} /></div>
              <div><Label>Grade</Label><Input value={form.grade || ''} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></div>
              <div><Label>Planned kg</Label><Input type="number" value={form.planned_kg || ''} onChange={(e) => setForm({ ...form, planned_kg: e.target.value })} /></div>
              <div><Label>Bags</Label><Input type="number" value={form.bags || ''} onChange={(e) => setForm({ ...form, bags: e.target.value })} /></div>
              <div><Label>Destination country</Label><Input value={form.destination_country || ''} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} /></div>
              <div><Label>Port of discharge</Label><Input value={form.port_of_discharge || ''} onChange={(e) => setForm({ ...form, port_of_discharge: e.target.value })} /></div>
              <div><Label>ETD</Label><Input type="date" value={form.etd || ''} onChange={(e) => setForm({ ...form, etd: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => createShipment.mutate()} disabled={createShipment.isPending}>Create shipment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Ship className="h-4 w-4" /> Shipment files</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment</TableHead><TableHead>Coffee</TableHead><TableHead>Planned kg</TableHead>
                <TableHead>Container</TableHead><TableHead>Vessel</TableHead><TableHead>ETD</TableHead><TableHead>Status</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No shipment files yet.</TableCell></TableRow>
              )}
              {shipments.map((s: any) => (
                <TableRow key={s.id} className={selected === s.id ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium">{s.shipment_number}</TableCell>
                  <TableCell>{s.coffee_type} {s.grade}</TableCell>
                  <TableCell className="tabular-nums">{Number(s.planned_kg).toLocaleString()}</TableCell>
                  <TableCell>{s.container_number || '—'}</TableCell>
                  <TableCell>{s.vessel_name || '—'}</TableCell>
                  <TableCell>{s.etd || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{s.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(selected === s.id ? null : s.id)}>
                      {selected === s.id ? 'Close' : 'Open'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {current && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Container & voyage — {current.shipment_number}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ['container_number', 'Container number'],
                ['seal_number', 'Seal number'],
                ['booking_reference', 'Booking reference'],
                ['shipping_line', 'Shipping line'],
                ['vessel_name', 'Vessel'],
                ['voyage_number', 'Voyage'],
                ['port_of_loading', 'Port of loading'],
                ['port_of_discharge', 'Port of discharge'],
                ['customs_reference', 'Customs reference'],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    defaultValue={current[key] || ''}
                    disabled={!canEdit}
                    onBlur={(e) => e.target.value !== (current[key] || '') && updateShipment.mutate({ id: current.id, patch: { [key]: e.target.value } })}
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={current.status} disabled={!canEdit} onValueChange={(v) => {
                  if ((v === 'loaded' || v === 'shipped') && loadingBlocked) {
                    toast({ title: 'Loading blocked', description: 'Final quality approval and all mandatory documents are required first.', variant: 'destructive' });
                    return;
                  }
                  updateShipment.mutate({ id: current.id, patch: { status: v } });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Final quality approval</p>
                  <p className="text-xs text-muted-foreground">Required before loading</p>
                </div>
                <Button
                  size="sm"
                  variant={current.quality_approved ? 'secondary' : 'default'}
                  disabled={!hasRole('export_manager', 'quality_manager')}
                  onClick={async () => updateShipment.mutate({
                    id: current.id,
                    patch: {
                      quality_approved: !current.quality_approved,
                      quality_approved_by: (await supabase.auth.getUser()).data.user?.id,
                    },
                  })}
                >
                  {current.quality_approved ? 'Approved' : 'Approve quality'}
                </Button>
              </div>
              {loadingBlocked && (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                  <Lock className="h-4 w-4 text-destructive shrink-0" />
                  <span>Loading is blocked: {!current.quality_approved && 'final quality approval outstanding'}
                    {!current.quality_approved && outstanding.length > 0 && '; '}
                    {outstanding.length > 0 && `${outstanding.length} mandatory document(s) not approved`}.</span>
                </div>
              )}
              {canEdit && !loadingBlocked && current.status !== 'loaded' && current.status !== 'shipped' && (
                <div className="sm:col-span-2">
                  <Button className="w-full" onClick={() => { setLoadForm({ loaded_kg: String(current.planned_kg || ''), bags: String(current.bags || '') }); setLoadOpen(true); }}>
                    <ContainerIcon className="h-4 w-4 mr-1" /> Record container loading
                  </Button>
                </div>
              )}
              {current.loaded_kg > 0 && (
                <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3 text-xs">
                  Loaded {Number(current.loaded_kg).toLocaleString()} kg in container {current.container_number} (seal {current.seal_number}).
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Document checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {docs.map((d: any) => (
                <div key={d.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.document_type}</p>
                      <p className="text-[11px] text-muted-foreground">{d.mandatory ? 'Mandatory' : 'Optional'} · v{d.version}</p>
                    </div>
                    <Select value={d.status} disabled={!canEdit} onValueChange={(v) => updateDoc.mutate({ id: d.id, patch: { status: v } })}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['pending', 'drafted', 'submitted', 'approved', 'not_required'].map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input className="h-8 text-xs" placeholder="Reference" defaultValue={d.reference || ''} disabled={!canEdit}
                      onBlur={(e) => e.target.value !== (d.reference || '') && updateDoc.mutate({ id: d.id, patch: { reference: e.target.value } })} />
                    <Input className="h-8 text-xs" type="date" defaultValue={d.issue_date || ''} disabled={!canEdit}
                      onBlur={(e) => e.target.value !== (d.issue_date || '') && updateDoc.mutate({ id: d.id, patch: { issue_date: e.target.value || null } })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </V3Layout>
  );
}