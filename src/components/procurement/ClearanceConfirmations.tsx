import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { validateClearanceConfirmation } from '@/lib/clearanceWorkflowRules';

export default function ClearanceConfirmations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [basis, setBasis] = useState('');
  const [contractId, setContractId] = useState('');
  const requests = useQuery({ queryKey: ['procurement-clearance-requests'], refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await (supabase as any).from('store_clearance_forms').select('*').in('procurement_status', ['pending', 'confirmed']).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data as any[];
  } });
  const contracts = useQuery({ queryKey: ['clearance-confirmation-contracts', selected?.destination_buyer], enabled: !!selected, queryFn: async () => {
    const active: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('buyer_contracts').select('id,contract_ref,buyer_name,status').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (error) throw error;
      active.push(...data.filter(c => !['cancelled', 'canceled', 'closed', 'completed'].includes(String(c.status).toLowerCase())));
      if (data.length < 500) break;
    }
    // Match buyer names loosely either way ("Kyagalanyi" vs "Kyagalanyi Coffee Limited");
    // if nothing matches, show every active contract so the confirmer can still pick.
    const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
    const buyer = norm(String(selected.destination_buyer || ''));
    const matched = buyer ? active.filter(c => { const name = norm(String(c.buyer_name || '')); return name && (name.includes(buyer) || buyer.includes(name)); }) : [];
    return matched.length ? matched : active;
  } });
  useEffect(() => {
    const channel = supabase.channel(`procurement-clearances-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'store_clearance_forms' }, () => {
      qc.invalidateQueries({ queryKey: ['procurement-clearance-requests'] });
      qc.invalidateQueries({ queryKey: ['store-clearance-forms'] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  const confirm = useMutation({ mutationFn: async () => {
    if (!selected) throw new Error('Choose a clearance');
    const choice = validateClearanceConfirmation(basis, contractId, selected.destination_buyer, contracts.data || []);
    const { data, error } = await (supabase as any).rpc('confirm_clearance_procurement', { p_clearance_id: selected.id, p_basis: choice.basis, p_contract_id: choice.contractId });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'Confirmation failed');
  }, onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ['procurement-clearance-requests'] }); qc.invalidateQueries({ queryKey: ['store-clearance-forms'] }); toast({ title: 'Clearance confirmed' }); }, onError: (error: any) => toast({ title: 'Could not confirm', description: error.message, variant: 'destructive' }) });
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Clearance Confirmations</h2><Badge variant="outline">{(requests.data || []).filter(r => r.procurement_status === 'pending').length} pending</Badge></div>
    {requests.isError ? <p role="alert" className="text-destructive">Could not load clearance requests.</p> : requests.isLoading ? <p className="text-muted-foreground">Loading…</p> : <div className="overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Clearance / Delivery note</TableHead><TableHead>Buyer</TableHead><TableHead>Vehicle</TableHead><TableHead>Batch / Coffee</TableHead><TableHead>Kg / Bags</TableHead><TableHead>Confirmation</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {!requests.data?.length && <TableRow><TableCell colSpan={7} className="text-center py-6">No clearance requests</TableCell></TableRow>}
      {(requests.data || []).map(row => <TableRow key={row.id}><TableCell><div className="font-mono text-xs">{row.form_number}<br />{row.delivery_note_number}</div><div className="text-xs text-muted-foreground">{row.clearance_date}</div></TableCell><TableCell>{row.destination_buyer}</TableCell><TableCell>{row.vehicle_registration}</TableCell><TableCell>{(row.items || []).map((item: any, index: number) => <div key={index} className="text-xs">{item.lot_ref} · {item.coffee_type}</div>)}</TableCell><TableCell>{Number(row.total_weight_kg).toLocaleString()} kg<br />{row.total_bags} bags</TableCell><TableCell><Badge variant={row.procurement_status === 'pending' ? 'outline' : 'secondary'}>{row.procurement_status === 'pending' ? 'Pending' : row.sale_basis === 'spot' ? 'Selling on spot' : 'Contract confirmed'}</Badge>{row.procurement_confirmed_by && <div className="text-xs text-muted-foreground break-words">{row.procurement_confirmed_by}<br />{new Date(row.procurement_confirmed_at).toLocaleString()}</div>}</TableCell><TableCell>{row.procurement_status === 'pending' && <Button size="sm" onClick={() => { setSelected(row); setBasis(''); setContractId(''); }}>Confirm</Button>}</TableCell></TableRow>)}
    </TableBody></Table></div>}
    <Dialog open={!!selected} onOpenChange={value => { if (!value && !confirm.isPending) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Confirm clearance sale basis</DialogTitle><DialogDescription>{selected?.form_number} · {selected?.destination_buyer}</DialogDescription></DialogHeader>
      <RadioGroup value={basis} onValueChange={setBasis} disabled={confirm.isPending} aria-label="Sale basis"><div className="flex items-center gap-2"><RadioGroupItem value="contract" id="clearance-basis-contract" /><Label htmlFor="clearance-basis-contract">Existing buyer contract</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="spot" id="clearance-basis-spot" /><Label htmlFor="clearance-basis-spot">Selling on spot</Label></div></RadioGroup>
      {basis === 'contract' && <div className="space-y-2"><Label>Buyer contract</Label><Select value={contractId} onValueChange={setContractId} disabled={contracts.isFetching || confirm.isPending}><SelectTrigger><SelectValue placeholder="Select matching buyer contract" /></SelectTrigger><SelectContent>{(contracts.data || []).map(c => <SelectItem key={c.id} value={c.id}>{c.contract_ref} · {c.buyer_name}</SelectItem>)}</SelectContent></Select>{contracts.isError && <p className="text-destructive">Could not load contracts.</p>}{!contracts.isFetching && !contracts.data?.length && <p className="text-muted-foreground">No available contracts for this buyer.</p>}</div>}
      <DialogFooter><Button variant="outline" onClick={() => setSelected(null)} disabled={confirm.isPending}>Cancel</Button><Button onClick={() => confirm.mutate()} disabled={confirm.isPending || !basis || (basis === 'contract' && (!contractId || contracts.isFetching || contracts.isError))}>{confirm.isPending ? 'Confirming…' : 'Confirm'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>;
}