import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';

const MD_EMAIL = 'fauzakusa@greatpearlcoffee.com';

interface BankDepositRequest {
  id: string;
  employee_name: string | null;
  employee_email: string;
  amount: number;
  fee: number;
  bank_name: string;
  branch: string | null;
  account_number: string;
  account_name: string;
  reference: string;
  status: string;
  created_at: string;
  admin_approved_by: string | null;
  paid_at: string | null;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending_admin':
      return <Badge variant="outline" className="border-amber-400 text-amber-700">Awaiting Admin</Badge>;
    case 'admin_approved':
      return <Badge variant="outline" className="border-blue-400 text-blue-700">Awaiting MD Payment</Badge>;
    case 'paid':
      return <Badge className="bg-emerald-600 text-white">Paid</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const BankDepositApprovals: React.FC = () => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const myEmail = (employee?.email || user?.email || '').toLowerCase();
  const isMD = myEmail === MD_EMAIL;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['bank-deposit-requests'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_deposit_requests' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as BankDepositRequest[]) || [];
    },
  });

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending_admin' || r.status === 'admin_approved'),
    [requests],
  );
  const history = useMemo(
    () => requests.filter((r) => r.status === 'paid' || r.status === 'rejected').slice(0, 10),
    [requests],
  );

  const notify = async (req: BankDepositRequest, message: string) => {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('phone, name')
        .eq('email', req.employee_email)
        .maybeSingle();
      if (emp?.phone) {
        await supabase.functions.invoke('send-sms', {
          body: { phone: emp.phone, message, userName: emp.name || req.employee_name || 'Staff' },
        });
      }
    } catch (e) {
      console.error('Bank deposit notification failed', e);
    }
  };

  const adminApprove = async (req: BankDepositRequest) => {
    setBusyId(req.id);
    try {
      const { error } = await supabase
        .from('bank_deposit_requests' as any)
        .update({ status: 'admin_approved', admin_approved_by: myEmail, admin_approved_at: new Date().toISOString() })
        .eq('id', req.id);
      if (error) throw error;
      toast({ title: 'Approved', description: 'Sent to the Managing Director for final approval and payment.' });
      await notify(req, `Great Agro Coffee: Your bank deposit request ${req.reference} of UGX ${Number(req.amount).toLocaleString()} has been approved by admin and is awaiting final payment.`);
      queryClient.invalidateQueries({ queryKey: ['bank-deposit-requests'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Approval failed', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (req: BankDepositRequest) => {
    const reason = window.prompt('Reason for rejection?') || '';
    if (!reason.trim()) return;
    setBusyId(req.id);
    try {
      const { error } = await supabase
        .from('bank_deposit_requests' as any)
        .update({ status: 'rejected', rejection_reason: reason, rejected_by: myEmail, rejected_at: new Date().toISOString() })
        .eq('id', req.id);
      if (error) throw error;
      toast({ title: 'Rejected', description: 'The request has been rejected.' });
      await notify(req, `Great Agro Coffee: Your bank deposit request ${req.reference} was rejected. Reason: ${reason}`);
      queryClient.invalidateQueries({ queryKey: ['bank-deposit-requests'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Rejection failed', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (req: BankDepositRequest) => {
    const paymentRef = window.prompt('Bank payment / transfer reference (optional)') || '';
    setBusyId(req.id);
    try {
      const { data, error } = await supabase.rpc('finalize_bank_deposit_request' as any, {
        p_request_id: req.id,
        p_payment_reference: paymentRef || null,
      });
      if (error) throw error;
      const res = data as any;
      if (res && res.ok === false) {
        toast({ title: 'Not allowed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Marked as Paid',
        description: `UGX ${Number(res?.total_deducted || 0).toLocaleString()} deducted from the employee wallet.`,
      });
      await notify(req, `Great Agro Coffee: Your bank deposit ${req.reference} of UGX ${Number(req.amount).toLocaleString()} has been PAID to ${req.bank_name} A/C ${req.account_number}. Fee: UGX ${Number(req.fee).toLocaleString()}.`);
      queryClient.invalidateQueries({ queryKey: ['bank-deposit-requests'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Could not mark as paid', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Bank Deposit Withdrawals
          {pending.length > 0 && <Badge variant="secondary">{pending.length} pending</Badge>}
        </CardTitle>
        <CardDescription>
          Staff requests to have wallet funds deposited to their bank accounts. Admin reviews first; only the Managing Director gives final approval and marks them paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
          </div>
        )}

        {!isLoading && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending bank deposit requests.</p>
        )}

        {pending.map((req) => (
          <div key={req.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{req.employee_name || req.employee_email}</p>
                <p className="text-xs text-muted-foreground">{req.reference} · {new Date(req.created_at).toLocaleString()}</p>
              </div>
              {statusBadge(req.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Amount:</span> <strong>UGX {Number(req.amount).toLocaleString()}</strong></div>
              <div><span className="text-muted-foreground">Service fee:</span> UGX {Number(req.fee).toLocaleString()}</div>
              <div><span className="text-muted-foreground">Bank:</span> {req.bank_name}{req.branch ? ` — ${req.branch}` : ''}</div>
              <div><span className="text-muted-foreground">A/C:</span> {req.account_number}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Account name:</span> {req.account_name}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Total to deduct:</span> <strong>UGX {(Number(req.amount) + Number(req.fee)).toLocaleString()}</strong></div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {req.status === 'pending_admin' && (
                <Button size="sm" onClick={() => adminApprove(req)} disabled={busyId === req.id}>
                  {busyId === req.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
              )}
              {req.status === 'admin_approved' && (
                isMD ? (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markPaid(req)} disabled={busyId === req.id}>
                    {busyId === req.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Final Approve &amp; Mark Paid
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Awaiting final approval and payment by the Managing Director.</p>
                )
              )}
              {req.status !== 'paid' && (
                <Button size="sm" variant="outline" onClick={() => reject(req)} disabled={busyId === req.id}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              )}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent completed</p>
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs border-b py-1">
                  <span>{h.employee_name || h.employee_email} — {h.bank_name} A/C {h.account_number}</span>
                  <span className="flex items-center gap-2">UGX {Number(h.amount).toLocaleString()} {statusBadge(h.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BankDepositApprovals;