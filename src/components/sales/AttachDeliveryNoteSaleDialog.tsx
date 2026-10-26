import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AttachDeliveryNoteSaleDialog({ note, onClose }: { note: any; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [saleId, setSaleId] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ['delivery-note-sale-picker', search, page],
    queryFn: async () => {
      let query = supabase.from('sales_transactions').select('id,date,customer,coffee_type,weight,truck_details,status').order('date', { ascending: false });
      if (search.trim()) query = query.ilike('customer', `%${search.trim()}%`);
      const { data, error } = await query.range(page * 50, page * 50 + 49);
      if (error) throw error;
      return (data || []).filter(row => !['cancelled', 'canceled'].includes(row.status.toLowerCase()));
    },
  });
  const attach = async () => {
    if (!saleId) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('attach_sale_to_delivery_note', { p_clearance_id: note.id, p_sale_id: saleId });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Sale was not attached');
      await qc.invalidateQueries({ queryKey: ['store-clearance-forms'] });
      toast.success('Sale attached to delivery note'); onClose();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent><DialogHeader><DialogTitle>Attach sale — {note.delivery_note_number}</DialogTitle><DialogDescription>{note.destination_buyer} · {Number(note.total_weight_kg).toLocaleString()} kg · {note.vehicle_registration}</DialogDescription></DialogHeader>
      <Input aria-label="Search sales by buyer" placeholder="Search buyer" value={search} onChange={event => { setSearch(event.target.value); setPage(0); setSaleId(''); }} />
      {error && <p className="text-sm text-destructive">Could not load sales. Please try again.</p>}
      <Select value={saleId} onValueChange={setSaleId}><SelectTrigger><SelectValue placeholder={isLoading ? 'Loading sales…' : 'Choose an existing sale'} /></SelectTrigger><SelectContent>
        {sales.map(sale => <SelectItem key={sale.id} value={sale.id}>{sale.date} · {sale.customer} · {sale.coffee_type} · {Number(sale.weight).toLocaleString()} kg · {sale.truck_details}</SelectItem>)}
      </SelectContent></Select>
      {!isLoading && sales.length === 0 && <p className="text-sm text-muted-foreground">No sales on this page.</p>}
      <div className="flex justify-between"><Button variant="outline" disabled={page === 0 || isLoading} onClick={() => { setPage(page - 1); setSaleId(''); }}>Previous</Button><span className="text-sm self-center">Page {page + 1}</span><Button variant="outline" disabled={isLoading || sales.length < 50} onClick={() => { setPage(page + 1); setSaleId(''); }}>Next</Button></div>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={!saleId || busy} onClick={attach}>{busy ? 'Attaching…' : 'Attach sale'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}