import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { printedPerDiemNumber, type PerDiemRequest } from '@/lib/perDiemRequests';

export default function PerDiemRequestSubmission() {
  const { employee } = useAuth();
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const { data: requests, error } = useQuery({
    queryKey: ['my-per-diem-requests', employee?.id],
    enabled: Boolean(employee?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('per_diem_requests').select('*').eq('employee_id', employee?.id || '').order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data as unknown as PerDiemRequest[];
    },
  });
  const submit = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('submit_per_diem_form', { p_number: printedPerDiemNumber(number) });
      if (error) throw error;
      setNumber('');
      await client.invalidateQueries({ queryKey: ['my-per-diem-requests'] });
      toast({ title: 'Per diem request submitted', description: 'Your request is now awaiting award.' });
    } catch (e) {
      toast({ title: 'Request not submitted', description: e instanceof Error ? e.message : (e as { message?: string }).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return <div className="mt-4 space-y-3 border-t pt-4">
    <Label htmlFor="per-diem-paper-number">Printed form number *</Label>
    <Input id="per-diem-paper-number" value={number} onChange={e => setNumber(e.target.value)} placeholder="PD-…" className="font-mono" />
    <Button onClick={submit} disabled={busy || !number.trim()} className="w-full gap-2"><Send className="h-4 w-4" />{busy ? 'Submitting…' : 'Submit per diem request'}</Button>
    {error && <p className="text-sm text-destructive">Unable to load your per diem requests.</p>}
    {requests?.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
      <div><p className="font-mono">{r.document_number}</p><p className="text-muted-foreground">{r.form_data.destination} · UGX {Number(r.amount).toLocaleString()}</p></div>
      <Badge variant="outline">{r.status === 'draft' ? 'Not submitted' : r.status === 'pending' ? 'Awaiting award' : 'Awarded'}</Badge>
    </div>)}
  </div>;
}