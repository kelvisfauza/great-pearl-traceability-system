import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Plus } from 'lucide-react';

export default function V3Trade() {
  const { hasRole } = useV3Roles();
  const canEdit = hasRole('trade_manager');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ contract_type: 'buyer', currency: 'USD', coffee_type: 'Arabica' });

  const { data: contracts = [] } = useQuery({
    queryKey: ['v3-contracts'],
    queryFn: async () => (await supabase.from('v3_contracts').select('*').order('created_at', { ascending: false })).data as any[] || [],
  });

  const { data: prices = [] } = useQuery({
    queryKey: ['v3-ref-prices'],
    queryFn: async () => (await supabase.from('v3_reference_prices').select('*').order('price_date', { ascending: false }).limit(20)).data as any[] || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('v3_contracts').insert({
        contract_number: `YEDA-${form.contract_type === 'buyer' ? 'BC' : 'SC'}-${Date.now().toString().slice(-6)}`,
        contract_type: form.contract_type,
        counterparty_name: form.counterparty_name,
        counterparty_country: form.counterparty_country || null,
        coffee_type: form.coffee_type,
        grade: form.grade || null,
        quality_spec: form.quality_spec || null,
        quantity_kg: Number(form.quantity_kg || 0),
        price: Number(form.price || 0),
        currency: form.currency,
        incoterm: form.incoterm || null,
        payment_terms: form.payment_terms || null,
        delivery_from: form.delivery_from || null,
        delivery_to: form.delivery_to || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Contract created' });
      setOpen(false); setForm({ contract_type: 'buyer', currency: 'USD', coffee_type: 'Arabica' });
      qc.invalidateQueries({ queryKey: ['v3-contracts'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <V3Layout
      title="Trade & Contracts"
      description="Buyer and supplier contracts, reference prices and allocation progress"
      actions={canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New contract</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create contract</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer contract</SelectItem>
                    <SelectItem value="supplier">Supplier contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Counterparty</Label><Input value={form.counterparty_name || ''} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={form.counterparty_country || ''} onChange={(e) => setForm({ ...form, counterparty_country: e.target.value })} /></div>
              <div><Label>Coffee type</Label><Input value={form.coffee_type || ''} onChange={(e) => setForm({ ...form, coffee_type: e.target.value })} /></div>
              <div><Label>Grade</Label><Input value={form.grade || ''} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></div>
              <div><Label>Quantity (kg)</Label><Input type="number" value={form.quantity_kg || ''} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} /></div>
              <div><Label>Price / kg</Label><Input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Currency</Label><Input value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
              <div><Label>Incoterm</Label><Input value={form.incoterm || ''} onChange={(e) => setForm({ ...form, incoterm: e.target.value })} /></div>
              <div><Label>Delivery from</Label><Input type="date" value={form.delivery_from || ''} onChange={(e) => setForm({ ...form, delivery_from: e.target.value })} /></div>
              <div><Label>Delivery to</Label><Input type="date" value={form.delivery_to || ''} onChange={(e) => setForm({ ...form, delivery_to: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {contracts.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No contracts yet.</CardContent></Card>}
        {contracts.map((c: any) => {
          const pct = c.quantity_kg ? Math.min(100, (Number(c.shipped_kg) / Number(c.quantity_kg)) * 100) : 0;
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{c.contract_number}</span>
                  <Badge variant={c.contract_type === 'buyer' ? 'default' : 'secondary'}>{c.contract_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{c.counterparty_name} {c.counterparty_country && `· ${c.counterparty_country}`}</p>
                <p className="text-muted-foreground">{c.coffee_type} {c.grade} · {Number(c.quantity_kg).toLocaleString()} kg · {c.currency} {Number(c.price).toLocaleString()}/kg {c.incoterm && `· ${c.incoterm}`}</p>
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground">
                  Allocated {Number(c.allocated_kg).toLocaleString()} kg · Shipped {Number(c.shipped_kg).toLocaleString()} kg · Balance {(Number(c.quantity_kg) - Number(c.shipped_kg)).toLocaleString()} kg
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Daily reference prices</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {prices.length === 0 && <p className="text-muted-foreground">No reference prices set.</p>}
          {prices.map((p: any) => (
            <div key={p.id} className="flex justify-between border-b last:border-0 py-1">
              <span>{p.price_date} · {p.coffee_type} {p.grade}</span>
              <span className="tabular-nums font-medium">{p.currency} {Number(p.reference_price).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </V3Layout>
  );
}