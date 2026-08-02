import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';

export default function V3Finance() {
  const { hasRole } = useV3Roles();
  const canApprove = hasRole('finance_manager');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['v3-payments'],
    queryFn: async () => (await supabase.from('v3_payments').select('*, v3_suppliers(name)').order('created_at', { ascending: false })).data as any[] || [],
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['v3-branch-float'],
    queryFn: async () => (await supabase.from('v3_branches').select('*').eq('active', true)).data as any[] || [],
  });

  const act = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, any> }) => {
      const { error } = await (supabase.from('v3_payments') as any).update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-payments'] }),
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <V3Layout title="Finance & Payments" description="Supplier payment requests, approvals and branch buying float">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {branches.map((b: any) => (
          <Card key={b.id}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{b.name} float</p>
            <p className="text-lg font-semibold tabular-nums">UGX {Number(b.float_balance).toLocaleString()}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payment requests</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Payment</TableHead><TableHead>Supplier</TableHead><TableHead>Amount</TableHead>
              <TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {payments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No payment requests.</TableCell></TableRow>}
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.payment_number}</TableCell>
                  <TableCell>{p.v3_suppliers?.name || '—'}</TableCell>
                  <TableCell className="tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{p.method}</TableCell>
                  <TableCell><Badge variant="outline">{p.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    {canApprove && p.status === 'pending_approval' && (
                      <Button size="sm" variant="outline" onClick={async () => act.mutate({
                        id: p.id,
                        values: { status: 'approved', approved_by: (await supabase.auth.getUser()).data.user?.id, approved_at: new Date().toISOString() },
                      })}>Approve</Button>
                    )}
                    {canApprove && p.status === 'approved' && (
                      <Button size="sm" onClick={() => act.mutate({ id: p.id, values: { status: 'paid', paid_at: new Date().toISOString() } })}>Mark paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}