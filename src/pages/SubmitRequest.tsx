import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

const MEAL_ITEMS = [
  'Matooke', 'Rice', 'Groundnuts', 'Peas', 'Charcoal', 'Beans',
  'Sugar', 'Spices', 'Maize Flour', 'Irish Potatoes',
];

const SubmitRequest = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mealItems, setMealItems] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState('');
  const [form, setForm] = useState({
    request_type: 'service_provider' as 'service_provider' | 'meal_plan' | 'support_staff_per_diem',
    provider_name: '',
    phone: '',
    email: '',
    amount: '',
    description: '',
    invoice_number: '',
    national_id: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleMealItem = (item: string) => {
    setMealItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provider_name.trim() || !form.phone.trim() || !form.amount || !form.description.trim()) {
      toast({ title: 'Missing details', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (form.request_type === 'meal_plan' && mealItems.length === 0 && !otherItems.trim()) {
      toast({ title: 'Select items', description: 'Please tick at least one meal item you will buy.', variant: 'destructive' });
      return;
    }
    const amt = Number(form.amount);
    if (isNaN(amt) || amt < 500) {
      toast({ title: 'Invalid amount', description: 'Minimum amount is UGX 500.', variant: 'destructive' });
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      toast({ title: 'Invalid phone', description: 'Enter a valid mobile money number.', variant: 'destructive' });
      return;
    }

    if (form.request_type === 'support_staff_per_diem' && !form.national_id.trim()) {
      toast({ title: 'NIN required', description: 'Enter your National ID (NIN) for support staff per-diem.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    let fullDescription = form.description.trim();
    if (form.request_type === 'meal_plan') {
      const items = [...mealItems];
      if (otherItems.trim()) items.push(`Others: ${otherItems.trim()}`);
      if (items.length) fullDescription += `\n\nItems to buy: ${items.join(', ')}`;
    }
    // Auto-generate invoice number if not provided (skip for support staff per-diem)
    let invoiceNo = form.invoice_number.trim();
    if (!invoiceNo && form.request_type !== 'support_staff_per_diem') {
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const rand = Math.floor(1000 + Math.random() * 9000);
      const prefix = form.request_type === 'meal_plan' ? 'MEAL' : 'SVC';
      invoiceNo = `${prefix}-${ymd}-${rand}`;
    }
    const { error } = await supabase.from('provider_submission_requests').insert({
      request_type: form.request_type,
      provider_name: form.provider_name.trim(),
      phone: cleanPhone,
      email: form.email.trim() || null,
      amount: amt,
      description: fullDescription,
      invoice_number: invoiceNo || null,
      national_id: form.national_id.trim() || null,
    } as any);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }
    // Fire-and-forget admin email notification
    supabase.functions.invoke('notify-admin-new-submission', {
      body: {
        submission_id: invoiceNo || `${form.request_type}-${cleanPhone}-${Date.now()}`,
        request_type: form.request_type,
        provider_name: form.provider_name.trim(),
        phone: cleanPhone,
        email: form.email.trim() || null,
        amount: amt,
        description: fullDescription,
        invoice_number: invoiceNo || null,
        national_id: form.national_id.trim() || null,
      },
    }).catch(() => {});
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Request Submitted</h2>
            <p className="text-muted-foreground">
              Your request has been sent to Great Agro Coffee for approval. You will receive an SMS
              once the payment is processed.
            </p>
            <Button onClick={() => { setSubmitted(false); setMealItems([]); setOtherItems(''); setForm({ request_type: 'service_provider', provider_name: '', phone: '', email: '', amount: '', description: '', invoice_number: '', national_id: '' }); }}>
              Submit another request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Payment Request</h1>
          <p className="text-muted-foreground mt-2">
            Submit your service / meal plan payment request to Great Agro Coffee
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Request Type *</Label>
                <Select value={form.request_type} onValueChange={(v) => update('request_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_provider">Service Provider Payment</SelectItem>
                    <SelectItem value="meal_plan">Meal Plan Payment</SelectItem>
                    <SelectItem value="support_staff_per_diem">Support Staff Per-Diem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={form.provider_name} onChange={(e) => update('provider_name', e.target.value)} placeholder="John Doe" maxLength={100} />
                </div>
                <div>
                  <Label>Mobile Money Number *</Label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="0772XXXXXX" maxLength={15} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email (optional)</Label>
                  <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" maxLength={150} />
                </div>
                <div>
                  <Label>{form.request_type === 'support_staff_per_diem' ? 'National ID (NIN) *' : 'Invoice Number (optional)'}</Label>
                  {form.request_type === 'support_staff_per_diem' ? (
                    <Input value={form.national_id} onChange={(e) => update('national_id', e.target.value)} placeholder="CM/CF..." maxLength={30} />
                  ) : (
                    <Input value={form.invoice_number} onChange={(e) => update('invoice_number', e.target.value)} placeholder="Auto-generated if left blank" maxLength={50} />
                  )}
                  {form.request_type !== 'support_staff_per_diem' && (
                    <p className="text-xs text-muted-foreground mt-1">Leave blank — we'll generate one for you.</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" min={500} value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="50000" />
              </div>

              <div>
                <Label>Service / Reason *</Label>
                <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the service rendered or meal plan being billed for" rows={4} maxLength={500} />
              </div>

              {form.request_type === 'meal_plan' && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <Label className="text-base font-semibold">Items to Buy *</Label>
                  <p className="text-xs text-muted-foreground">Tick all the items you will purchase for this meal plan.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MEAL_ITEMS.map((item) => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={mealItems.includes(item)}
                          onCheckedChange={() => toggleMealItem(item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label className="text-sm">Others (specify)</Label>
                    <Input
                      value={otherItems}
                      onChange={(e) => setOtherItems(e.target.value)}
                      placeholder="e.g. tomatoes, onions, cooking oil"
                      maxLength={200}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>) : (<><Send className="w-4 h-4 mr-2" />Submit Request</>)}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your request will be reviewed by Great Agro Coffee. Approved requests are paid out automatically via Mobile Money.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitRequest;