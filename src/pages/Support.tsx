import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'support@greatpearlcoffee.com';

export default function Support() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    subject: '', message: '', category: 'general', priority: 'medium',
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-support-ticket', { body: form });
      if (error) throw error;
      const payload = data as { ok: boolean; ticket_code?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error || 'Submission failed');
      setDone(payload.ticket_code!);
      toast({ title: 'Ticket submitted', description: `Your reference is ${payload.ticket_code}` });
    } catch (err) {
      toast({ title: 'Could not submit', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-14 w-14 mx-auto text-green-600 mb-2" />
            <CardTitle>Ticket received</CardTitle>
            <CardDescription>We've logged your message and emailed a confirmation.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Your ticket ID</div>
              <div className="text-2xl font-mono font-bold tracking-wider">{done}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep this ID for your records. Our team will reply to <b>{form.customer_email}</b>.
            </p>
            <Button onClick={() => { setDone(null); setForm({ customer_name:'', customer_email:'', customer_phone:'', subject:'', message:'', category:'general', priority:'medium' }); }}>
              Submit another ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contact Customer Support</CardTitle>
            <CardDescription>
              Great Agro Coffee — a member of Hello YEDA COFFEE COMPANY LIMITED. We usually respond within one business day.
            </CardDescription>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> Or email us directly at <b>{SUPPORT_EMAIL}</b>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Your name *</Label>
                  <Input required maxLength={120} value={form.customer_name} onChange={e => update('customer_name', e.target.value)} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input required type="email" maxLength={200} value={form.customer_email} onChange={e => update('customer_email', e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Phone (optional)</Label>
                  <Input maxLength={30} value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => update('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General inquiry</SelectItem>
                      <SelectItem value="coffee_sales">Coffee sales</SelectItem>
                      <SelectItem value="supplier">Supplier / delivery</SelectItem>
                      <SelectItem value="payment">Payment issue</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => update('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Input required maxLength={200} value={form.subject} onChange={e => update('subject', e.target.value)} />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea required maxLength={5000} rows={6} value={form.message} onChange={e => update('message', e.target.value)} />
                <div className="text-xs text-muted-foreground mt-1 text-right">{form.message.length}/5000</div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}