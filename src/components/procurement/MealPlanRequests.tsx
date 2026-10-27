import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';
import { mealPlanPayload, type MealPayment } from '@/lib/mealPlanRules';
import { downloadMealPlanTemplate, printMealPlanTemplates } from '@/utils/mealPlanPdf';

const empty = { documentNumber: '', name: '', phone: '', email: '', amount: '', description: '', payment: 'mobile_money' as MealPayment };
export default function MealPlanRequests() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [issued, setIssued] = useState('');
  const [bulkCount, setBulkCount] = useState('10');
  async function bulkTemplates() {
    const n = Math.floor(Number(bulkCount));
    if (!(n >= 1 && n <= 100)) { toast.error('Enter between 1 and 100 forms'); return; }
    const preview = window.open('', '_blank');
    if (!preview) { toast.error('Allow pop-ups to print meal-plan forms'); return; }
    preview.document.title = 'Preparing meal-plan forms';
    setPrinting(true);
    try {
      const { data, error } = await (supabase as any).from('meal_plan_forms').insert(Array.from({ length: n }, () => ({}))).select('document_number');
      if (error) throw error;
      const numbers = (data || []).map((r: any) => r.document_number).sort();
      await printMealPlanTemplates(numbers, preview);
      toast.success(`${numbers.length} numbered forms issued: ${numbers[0]} to ${numbers[numbers.length - 1]}`);
    } catch (e) { preview.close(); toast.error(e instanceof Error ? e.message : 'Unable to issue forms'); }
    finally { setPrinting(false); }
  }
  const qc = useQueryClient();
  const { data: requests = [], error: loadError } = useQuery({ queryKey: ['paper-meal-requests'], queryFn: async () => {
    const { data, error } = await (supabase as any).from('provider_submission_requests').select('id,invoice_number,provider_name,amount,status,requested_payment_method').eq('request_type','meal_plan').not('paper_document_number','is',null).order('created_at', { ascending: false }).limit(50);
    if (error) throw error; return data || [];
  }, refetchInterval: 15000 });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  async function template() {
    setPrinting(true);
    try {
      const { data, error } = await (supabase as any).from('meal_plan_forms').insert({}).select('document_number').single();
      if (error) throw error;
      setIssued(data.document_number); update('documentNumber', data.document_number);
      await downloadMealPlanTemplate(data.document_number);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to issue template'); }
    finally { setPrinting(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = mealPlanPayload(form);
      const { error } = await (supabase as any).from('provider_submission_requests').insert(payload);
      if (error) throw new Error(error.code === '23505' ? 'This document has already been submitted.' : error.code === '23503' ? 'Document number not found. Enter the number from an issued meal-plan form.' : error.message);
      toast.success('Meal plan submitted for Procurement review and Admin approval');
      setForm(empty); qc.invalidateQueries({ queryKey: ['paper-meal-requests'] });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Submission failed'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6 py-4">
    <div className="flex items-center justify-between flex-wrap gap-3"><h2 className="text-xl font-semibold">Meal Plans</h2><div className="flex flex-wrap gap-2">
      {issued && <Button variant="outline" disabled={printing} onClick={() => { setPrinting(true); downloadMealPlanTemplate(issued).catch(e => toast.error(e.message)).finally(() => setPrinting(false)); }}><Download className="h-4 w-4 mr-2" />Download {issued}</Button>}
      <Button variant="outline" disabled={printing} onClick={template}>{printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}New A4 template</Button>
      <div className="flex items-center gap-2"><input type="number" min={1} max={100} value={bulkCount} onChange={e => setBulkCount(e.target.value)} aria-label="Number of forms" className="h-10 w-20 rounded-md border border-input bg-background px-2 text-sm" />
      <Button variant="outline" disabled={printing} onClick={bulkTemplates}><Printer className="h-4 w-4 mr-2" />Print in bulk</Button></div>
    </div></div>
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <h3 className="font-medium">Submit completed paper form</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label htmlFor="meal-doc">Document number</Label><Input id="meal-doc" required value={form.documentNumber} onChange={e => update('documentNumber',e.target.value)} placeholder="MP-2026-000001" /></div>
        <div><Label htmlFor="meal-amount">Amount on document (UGX)</Label><Input id="meal-amount" type="number" min="500" required value={form.amount} onChange={e => update('amount',e.target.value)} /></div>
        <div><Label htmlFor="meal-name">Recipient name</Label><Input id="meal-name" required maxLength={100} value={form.name} onChange={e => update('name',e.target.value)} /></div>
        <div><Label htmlFor="meal-email">Email (optional)</Label><Input id="meal-email" type="email" value={form.email} onChange={e => update('email',e.target.value)} /></div>
      </div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Payment on document</legend><RadioGroup value={form.payment} onValueChange={v => update('payment',v)} className="flex gap-6"><div className="flex items-center gap-2"><RadioGroupItem value="cash" id="meal-cash"/><Label htmlFor="meal-cash">Cash</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="mobile_money" id="meal-momo"/><Label htmlFor="meal-momo">Mobile Money</Label></div></RadioGroup></fieldset>
      <div><Label htmlFor="meal-phone">{form.payment === 'cash' ? 'Contact number (optional)' : 'Recipient mobile money number'}</Label><Input id="meal-phone" type="tel" required={form.payment === 'mobile_money'} value={form.phone} onChange={e => update('phone',e.target.value)} placeholder="0772XXXXXX" /></div>
      <div><Label htmlFor="meal-details">Meal period / items and purpose on document</Label><Textarea id="meal-details" required maxLength={1000} rows={4} value={form.description} onChange={e => update('description',e.target.value)} /></div>
      <Button disabled={busy || printing} type="submit">{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Submit Request</Button>
    </form>
    <div className="border-t pt-4 space-y-3"><h3 className="font-medium">Paper meal-plan requests</h3>{loadError && <p className="text-destructive">Unable to load meal-plan requests.</p>}<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Recipient</TableHead><TableHead>Amount (UGX)</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{requests.map((r: any) => <TableRow key={r.id}><TableCell>{r.invoice_number}</TableCell><TableCell>{r.provider_name}</TableCell><TableCell>{Number(r.amount).toLocaleString()}</TableCell><TableCell>{r.requested_payment_method === 'cash' ? 'Cash' : 'Mobile money'}</TableCell><TableCell>{r.status.replaceAll('_',' ')}</TableCell></TableRow>)}{!requests.length && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No paper meal-plan requests.</TableCell></TableRow>}</TableBody></Table></div></div>
  </section>;
}