import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVendorAccounts, vendorAction, vendorPayments } from '@/hooks/useVendorAccounts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, RefreshCw, Search, Users, Printer } from 'lucide-react';
import { printMealPaymentReceipt } from '@/utils/mealPaymentReceipt';

const money = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;
const emptyForm = { name: '', phone: '', email: '', service_category: 'services', notes: '' };

export default function VendorAccounts() {
  const { toast } = useToast();
  const client = useQueryClient();
  const { data: vendors = [], isLoading, error, refetch } = useVendorAccounts();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const history = useQuery({ queryKey: ['vendor-history', selected, page], enabled: Boolean(selected), queryFn: () => vendorAction('history', { vendor: selected, offset: page * 50 }) });
  const payments = useQuery({ queryKey: ['vendor-other-payments', selected, page], enabled: Boolean(selected), queryFn: () => vendorPayments(selected, page * 50) });
  const create = async () => {
    setSaving(true);
    try {
      const result = await vendorAction('create', { details: form });
      await client.invalidateQueries({ queryKey: ['vendor-accounts'] });
      await client.invalidateQueries({ queryKey: ['saved-service-providers'] });
      setSelected(result.vendor.id); setPage(0); setOpen(false); setForm(emptyForm);
      toast({ title: 'Vendor account created', description: result.vendor.vendor_number });
    } catch (e) { toast({ title: 'Account not created', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const vendor = history.data?.vendor;
  return <section className="space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h2 className="text-2xl font-display">Vendor accounts</h2><p className="text-sm text-muted-foreground">{vendors.length} service providers</p></div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label="Refresh vendor accounts" title="Refresh" onClick={() => { refetch(); if (selected) { history.refetch(); payments.refetch(); } }}><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New vendor</Button>
      </div>
    </div>
    {error && <p role="alert" className="text-destructive">{error.message}</p>}
    {selected ? <>
      <Button variant="ghost" onClick={() => setSelected('')}><ArrowLeft className="h-4 w-4 mr-2" />All vendors</Button>
      {history.isLoading ? <p className="text-muted-foreground">Loading account…</p> : history.error ? <p role="alert" className="text-destructive">{history.error.message}</p> : vendor ? <>
        <header className="border-b pb-4 space-y-2">
          <Badge variant="outline">{vendor.vendor_number}</Badge>
          <h3 className="text-2xl font-display break-words">{vendor.name}</h3>
          <p className="text-muted-foreground break-words">{vendor.service_category.replace(/_/g, ' ')} · {vendor.phone || 'No phone'}{vendor.email ? ` · ${vendor.email}` : ''}</p>
          {vendor.notes && <p className="text-sm">{vendor.notes}</p>}
          <Button variant="outline" size="sm" onClick={() => window.open(`/submit-request?vendor=${vendor.id}`, '_blank', 'noopener,noreferrer')}>New payment request</Button>
        </header>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-b pb-5">
          {([['Requested', 'requested'], ['Approved incl. charges', 'approved'], ['Recorded paid incl. charges', 'paid'], ['Approved balance incl. charges', 'outstanding']] as const).map(([label, key]) => <div key={key} className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold break-words">{key === 'paid' && !payments.data ? 'Unavailable' : money(Number(history.data.totals[key]) + (key === 'paid' ? Number(payments.data?.paid || 0) : 0))}</p></div>)}
        </div>
        <h4 className="font-semibold">Requests &amp; approval history ({history.data.totals.count})</h4>
        {history.data.requests.length === 0 && <p className="text-muted-foreground">No requests attached to this vendor account.</p>}
        <div className="space-y-3">
          {history.data.requests.map((r: any) => <article key={r.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between flex-wrap gap-2"><div className="min-w-0"><p className="font-semibold break-words">{r.paper_document_number || r.invoice_number || 'Unnumbered request'}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · {r.request_type.replace(/_/g, ' ')}</p></div><Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge></div>
            <p className="text-sm whitespace-pre-wrap break-words">{r.description}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm"><span>Requested: {money(r.requested_amount)}</span><span>Approved: {money(r.approved_amount)}</span><span>Recorded paid: {money(r.paid_amount)}</span></div>
            <dl className="text-xs space-y-1 text-muted-foreground">
              {r.procurement_decision && <div>Procurement: {r.procurement_decision} · {r.procurement_reviewed_by || 'Name not recorded'}{r.procurement_reviewed_at ? ` · ${new Date(r.procurement_reviewed_at).toLocaleString()}` : ''}</div>}
              {r.procurement_notes && <div>Review notes: {r.procurement_notes}</div>}
              {(r.admin_approved_by_name || r.reviewed_by_name) && <div>Admin: {r.admin_approved_by_name || r.reviewed_by_name}</div>}
              {r.finance_released_by_name && <div>Finance: {r.finance_released_by_name}</div>}
              {r.payout_status && <div>Payment status: {r.payout_status}</div>}
              {r.rejection_reason && <div>Rejection reason: {r.rejection_reason}</div>}
            </dl>
            {r.request_type === 'meal_plan' && r.status === 'paid' && <Button variant="outline" size="sm" disabled={printing} onClick={async () => { setPrinting(true); try { await printMealPaymentReceipt(r.id); } catch (e) { toast({ title: 'Receipt not printed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); } finally { setPrinting(false); } }}><Printer className="h-4 w-4 mr-2" />Print payment receipt</Button>}
          </article>)}
        </div>
        <h4 className="font-semibold">Other recorded payments</h4>
        {payments.error ? <p role="alert" className="text-destructive">{payments.error.message}</p> : payments.isLoading ? <p className="text-muted-foreground">Loading payments…</p> : <div className="space-y-3">
          {payments.data?.payments.map((p: any) => <article key={p.id} className="border rounded-lg p-4 space-y-2"><div className="flex justify-between flex-wrap gap-2"><p className="font-semibold">{money(Number(p.amount) + Number(p.withdraw_charge))}</p><Badge variant="outline">{p.yo_status}</Badge></div><p className="text-sm break-words">{p.service_description}</p><p className="text-xs text-muted-foreground break-words">{new Date(p.created_at).toLocaleString()} · {p.payment_method} · {p.initiated_by_name || 'Name not recorded'}{p.yo_reference ? ` · ${p.yo_reference}` : ''}</p></article>)}
          {!payments.data?.payments.length && <p className="text-muted-foreground">No other recorded payments on this page.</p>}
        </div>}
        <div className="flex items-center justify-end gap-2"><Button variant="outline" size="icon" aria-label="Previous requests" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">Page {page + 1}</span><Button variant="outline" size="icon" aria-label="Next requests" disabled={(page + 1) * 50 >= Math.max(history.data.totals.count, payments.data?.count || 0)} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
      </> : null}
    </> : <>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search vendor accounts" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, vendor number or phone" /></div>
      {isLoading ? <p className="text-muted-foreground">Loading vendors…</p> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{vendors.filter(v => `${v.name} ${v.vendor_number} ${v.phone}`.toLowerCase().includes(search.toLowerCase())).map(v => <Button key={v.id} variant="outline" className="h-auto p-4 justify-start whitespace-normal text-left" onClick={() => { setSelected(v.id); setPage(0); }}><Users className="h-5 w-5 mr-3 shrink-0 text-primary" /><span className="min-w-0 space-y-1"><span className="block font-semibold break-words">{v.name}</span><span className="block text-xs text-muted-foreground break-words">{v.vendor_number} · {v.service_category.replace(/_/g, ' ')}</span><span className="block text-xs text-muted-foreground">{v.phone || 'No phone'}</span></span></Button>)}</div>}
      {!isLoading && !error && !vendors.some(v => `${v.name} ${v.vendor_number} ${v.phone}`.toLowerCase().includes(search.toLowerCase())) && <p className="text-muted-foreground">No matching vendor accounts.</p>}
    </>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New vendor account</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="vendor-name">Vendor name</Label><Input id="vendor-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={200} /></div>
      <div className="space-y-2"><Label htmlFor="vendor-phone">Phone</Label><Input id="vendor-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      <div className="space-y-2"><Label htmlFor="vendor-email">Email (optional)</Label><Input id="vendor-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      <div className="space-y-2"><Label>Service category</Label><Select value={form.service_category} onValueChange={value => setForm(f => ({ ...f, service_category: value }))}><SelectTrigger aria-label="Service category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="meals_catering">Meals / Catering</SelectItem><SelectItem value="services">Other services</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="vendor-notes">Notes (optional)</Label><Textarea id="vendor-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
    </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving || form.name.trim().length < 2 || !form.phone.trim()} onClick={create}>{saving ? 'Creating…' : 'Create account'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}