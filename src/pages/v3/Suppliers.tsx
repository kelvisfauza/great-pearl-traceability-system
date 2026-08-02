import { useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { Plus, Search, Pencil, Users, Coffee } from 'lucide-react';

interface SupplierForm {
  id?: string;
  name: string;
  code: string;
  phone: string;
  alternative_phone: string;
  email: string;
  origin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

const emptySupplier: SupplierForm = {
  name: '', code: '', phone: '', alternative_phone: '', email: '',
  origin: '', bank_name: '', account_name: '', account_number: '',
};

export default function V3Suppliers() {
  const { hasRole, isV3Admin } = useV3Roles();
  const canManage = isV3Admin || hasRole('trade_manager', 'branch_manager', 'store_manager', 'procurement_it');
  const canManageTypes = isV3Admin || hasRole('trade_manager', 'quality_manager');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplier);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeForm, setTypeForm] = useState<Record<string, string>>({ category: 'Arabica' });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['v3-master-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id,name,code,phone,alternative_phone,email,origin,bank_name,account_name,account_number,opening_balance,date_registered')
        .order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: coffeeTypes = [] } = useQuery({
    queryKey: ['v3-coffee-types'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('v3_coffee_types' as any) as any).select('*').order('category').order('name');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s: any) =>
      [s.name, s.code, s.phone, s.origin].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q)));
  }, [suppliers, search]);

  const saveSupplier = useMutation({
    mutationFn: async (f: SupplierForm) => {
      const payload: any = {
        name: f.name.trim(),
        code: f.code.trim() || null,
        phone: f.phone.trim() || null,
        alternative_phone: f.alternative_phone.trim() || null,
        email: f.email.trim() || null,
        origin: f.origin.trim() || null,
        bank_name: f.bank_name.trim() || null,
        account_name: f.account_name.trim() || null,
        account_number: f.account_number.trim() || null,
      };
      if (!payload.name) throw new Error('Supplier name is required');
      if (f.id) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert({ ...payload, date_registered: new Date().toISOString().slice(0, 10) });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Supplier saved', description: 'Synced to the V3 supplier registry.' });
      setSupplierOpen(false); setSupplierForm(emptySupplier);
      qc.invalidateQueries({ queryKey: ['v3-master-suppliers'] });
      qc.invalidateQueries({ queryKey: ['v3-suppliers'] });
    },
    onError: (e: any) => toast({ title: 'Could not save supplier', description: e.message, variant: 'destructive' }),
  });

  const saveType = useMutation({
    mutationFn: async () => {
      if (!typeForm.name?.trim()) throw new Error('Coffee type name is required');
      const payload = {
        name: typeForm.name.trim(),
        category: typeForm.category || 'Arabica',
        description: typeForm.description || null,
      };
      if (typeForm.id) {
        const { error } = await (supabase.from('v3_coffee_types' as any) as any).update(payload).eq('id', typeForm.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('v3_coffee_types' as any) as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Coffee type saved' });
      setTypeOpen(false); setTypeForm({ category: 'Arabica' });
      qc.invalidateQueries({ queryKey: ['v3-coffee-types'] });
    },
    onError: (e: any) => toast({ title: 'Could not save coffee type', description: e.message, variant: 'destructive' }),
  });

  const toggleType = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await (supabase.from('v3_coffee_types' as any) as any).update({ active: !t.active }).eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-coffee-types'] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <V3Layout
      title="Suppliers & Coffee Types"
      description="Master supplier register shared with the main system, plus the coffee grades used across receiving, production and export"
    >
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers"><Users className="h-4 w-4 mr-1" /> Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="types"><Coffee className="h-4 w-4 mr-1" /> Coffee types ({coffeeTypes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Supplier register</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8 h-9 w-48 sm:w-64" placeholder="Search name, code, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {canManage && (
                  <Button size="sm" onClick={() => { setSupplierForm(emptySupplier); setSupplierOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add supplier
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                    <TableHead>Origin</TableHead><TableHead>Bank</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Loading suppliers…</TableCell></TableRow>}
                  {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No suppliers match your search.</TableCell></TableRow>}
                  {filtered.slice(0, 300).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="secondary">{s.code || '—'}</Badge></TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                      <TableCell>{s.origin || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{s.bank_name ? `${s.bank_name} · ${s.account_number || ''}` : '—'}</TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <Button size="sm" variant="ghost" onClick={() => {
                            setSupplierForm({
                              id: s.id, name: s.name || '', code: s.code || '', phone: s.phone || '',
                              alternative_phone: s.alternative_phone || '', email: s.email || '', origin: s.origin || '',
                              bank_name: s.bank_name || '', account_name: s.account_name || '', account_number: s.account_number || '',
                            });
                            setSupplierOpen(true);
                          }}><Pencil className="h-4 w-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 300 && <p className="text-xs text-muted-foreground mt-2">Showing first 300 of {filtered.length}. Refine your search to narrow the list.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Coffee types & grades</CardTitle>
              {canManageTypes && (
                <Button size="sm" onClick={() => { setTypeForm({ category: 'Arabica' }); setTypeOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add type
                </Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
                </TableHeader>
                <TableBody>
                  {coffeeTypes.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No coffee types yet.</TableCell></TableRow>}
                  {coffeeTypes.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{t.description || '—'}</TableCell>
                      <TableCell>{t.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {canManageTypes && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setTypeForm({ id: t.id, name: t.name, category: t.category, description: t.description || '' }); setTypeOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => toggleType.mutate(t)}>{t.active ? 'Disable' : 'Enable'}</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{supplierForm.id ? 'Edit supplier' : 'Add supplier'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Supplier name *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div><Label>Code</Label><Input value={supplierForm.code} onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })} /></div>
            <div><Label>Origin / district</Label><Input value={supplierForm.origin} onChange={(e) => setSupplierForm({ ...supplierForm, origin: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            <div><Label>Alternative phone</Label><Input value={supplierForm.alternative_phone} onChange={(e) => setSupplierForm({ ...supplierForm, alternative_phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            <div><Label>Bank name</Label><Input value={supplierForm.bank_name} onChange={(e) => setSupplierForm({ ...supplierForm, bank_name: e.target.value })} /></div>
            <div><Label>Account name</Label><Input value={supplierForm.account_name} onChange={(e) => setSupplierForm({ ...supplierForm, account_name: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Account number</Label><Input value={supplierForm.account_number} onChange={(e) => setSupplierForm({ ...supplierForm, account_number: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveSupplier.mutate(supplierForm)} disabled={saveSupplier.isPending}>Save supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{typeForm.id ? 'Edit coffee type' : 'Add coffee type'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={typeForm.name || ''} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={typeForm.category} onValueChange={(v) => setTypeForm({ ...typeForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arabica">Arabica</SelectItem>
                  <SelectItem value="Robusta">Robusta</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={typeForm.description || ''} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => saveType.mutate()} disabled={saveType.isPending}>Save type</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </V3Layout>
  );
}
