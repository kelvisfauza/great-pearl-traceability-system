import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileSignature, Check, X, Loader2 } from 'lucide-react';

const ContractRenewalApprovals = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('contract_renewal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, decision: 'approve' | 'reject') => {
    if (!employee) return;
    setActing(id);
    const { data, error } = await supabase.functions.invoke('approve-contract-renewal', {
      body: { requestId: id, decision, adminEmail: employee.email, adminNotes: notes[id] || '' },
    });
    setActing(null);
    if (error || (data && data.ok === false)) {
      toast({ title: `Failed to ${decision}`, description: error?.message || data?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: decision === 'approve' ? 'Renewal approved' : 'Renewal rejected', description: 'Employee has been notified by email.' });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Contract Renewal Requests
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No pending renewal requests</div>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee_email}</p>
                  </div>
                  <Badge className="bg-amber-500">{r.requested_months} month renewal</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Phone:</span> {r.updated_phone || '—'}</div>
                  <div><span className="text-muted-foreground">Emergency:</span> {r.emergency_contact || '—'}</div>
                  <div><span className="text-muted-foreground">NSSF:</span> {r.nssf_number || '—'}</div>
                  <div><span className="text-muted-foreground">TIN:</span> {r.tin_number || '—'}</div>
                  <div><span className="text-muted-foreground">Bank:</span> {r.bank_name || '—'}</div>
                  <div><span className="text-muted-foreground">Acct:</span> {r.bank_account || '—'}</div>
                </div>
                <div className="text-sm bg-muted/50 rounded p-2">
                  <span className="text-xs text-muted-foreground">Reason: </span>{r.reason}
                </div>
                <div className="text-xs text-muted-foreground">Signed: <span className="font-serif italic">{r.signature}</span></div>
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[r.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => act(r.id, 'approve')} disabled={acting === r.id} className="flex-1 bg-green-600 hover:bg-green-700">
                    {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Approve</>}
                  </Button>
                  <Button onClick={() => act(r.id, 'reject')} disabled={acting === r.id} variant="destructive" className="flex-1">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractRenewalApprovals;