import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, ArrowDownCircle, CheckCircle, XCircle, Clock, Loader2, ShieldAlert, TrendingDown, Info } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Overdraft = () => {
  const { employee, user, isAdmin: isAdminFn } = useAuth();
  const isAdmin = typeof isAdminFn === 'function' ? isAdminFn() : !!isAdminFn;
  const { toast } = useToast();
  const qc = useQueryClient();
  const email = employee?.email || user?.email || '';

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [drawAmount, setDrawAmount] = useState('');
  const [drawReason, setDrawReason] = useState('');

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [reviewApp, setReviewApp] = useState<any>(null);
  const [approveLimit, setApproveLimit] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // My account
  const { data: myAccount } = useQuery({
    queryKey: ['my-overdraft-account', email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('get_overdraft_account', { user_email: email });
      return data?.[0] || null;
    },
  });

  // My applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-overdraft-apps', email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('overdraft_applications')
        .select('*')
        .eq('employee_email', email)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // My transactions
  const { data: myTransactions = [] } = useQuery({
    queryKey: ['my-overdraft-tx', myAccount?.id],
    enabled: !!myAccount?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('overdraft_transactions')
        .select('*')
        .eq('account_id', myAccount.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Admin: all pending applications
  const { data: allApplications = [] } = useQuery({
    queryKey: ['all-overdraft-apps', email],
    enabled: isAdmin && !!email,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('list_overdraft_applications_admin', { p_email: email });
      return data || [];
    },
  });

  // Admin: all active accounts
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-overdraft-accounts', email],
    enabled: isAdmin && !!email,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('list_overdraft_accounts_admin', { p_email: email });
      return data || [];
    },
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['my-overdraft-account'] });
    qc.invalidateQueries({ queryKey: ['my-overdraft-apps'] });
    qc.invalidateQueries({ queryKey: ['my-overdraft-tx'] });
    qc.invalidateQueries({ queryKey: ['all-overdraft-apps'] });
    qc.invalidateQueries({ queryKey: ['all-overdraft-accounts'] });
  };

  const handleApply = async () => {
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('overdraft-apply', {
        body: { user_email: email, requested_amount: Number(requestedAmount), reason: applyReason },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed to apply');
      toast({
        title: 'Application Submitted',
        description: `AI-calculated limit: UGX ${Number(data.calculated_limit).toLocaleString()}. Admin will review.`,
      });
      setShowApplyDialog(false);
      setRequestedAmount('');
      setApplyReason('');
      refreshAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDraw = async () => {
    if (!drawAmount || Number(drawAmount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('overdraft-draw', {
        body: { user_email: email, amount: Number(drawAmount), reason: drawReason },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed');
      toast({
        title: 'Overdraft Drawn',
        description: `UGX ${Number(data.drawn).toLocaleString()} credited to wallet. New outstanding: UGX ${Number(data.new_outstanding).toLocaleString()}`,
      });
      setShowDrawDialog(false);
      setDrawAmount('');
      setDrawReason('');
      refreshAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (action: 'approve' | 'reject') => {
    if (!reviewApp) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('overdraft-approve', {
        body: {
          application_id: reviewApp.id,
          action,
          approved_limit: action === 'approve' ? Number(approveLimit || reviewApp.calculated_limit) : undefined,
          rejection_reason: action === 'reject' ? rejectReason : undefined,
          approver_email: email,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed');
      toast({ title: action === 'approve' ? 'Overdraft Approved' : 'Application Rejected' });
      setShowApproveDialog(false);
      setReviewApp(null);
      setApproveLimit('');
      setRejectReason('');
      refreshAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-emerald-100 text-emerald-800',
      closed: 'bg-gray-100 text-gray-800',
      suspended: 'bg-orange-100 text-orange-800',
    };
    return <Badge className={map[s] || 'bg-gray-100 text-gray-800'}>{s}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingDown className="h-7 w-7 text-primary" /> Overdraft Program
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Draw more than your wallet balance — auto-recovered from future credits.
            </p>
          </div>
        </div>

        {/* Info banner */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 text-sm flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong>How it works:</strong> Your limit is set from your wallet activity (avg monthly inflow × 0.5).</p>
              <p><strong>Activation fee:</strong> Flat 5% of approved limit, charged once on approval.</p>
              <p><strong>Repayment:</strong> Auto-recovered from any future wallet credit (salary, loyalty, deposits) until cleared.</p>
              <p><strong>Approval:</strong> Admin (Fauza) only — fast track.</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Overdraft</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin Panel</TabsTrigger>}
          </TabsList>

          {/* MY TAB */}
          <TabsContent value="my" className="space-y-6">
            {myAccount ? (
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved Limit</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">UGX {Number(myAccount.approved_limit).toLocaleString()}</div></CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">UGX {Number(myAccount.outstanding_balance).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Auto-recovered from next credits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Available</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">UGX {Number(myAccount.available_overdraft).toLocaleString()}</div>
                    <Button className="mt-2 w-full" size="sm" onClick={() => setShowDrawDialog(true)} disabled={Number(myAccount.available_overdraft) <= 0}>
                      <ArrowDownCircle className="h-4 w-4 mr-1" /> Draw Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">You don't have an active overdraft.</p>
                  <Button onClick={() => setShowApplyDialog(true)}>
                    <Wallet className="h-4 w-4 mr-2" /> Apply for Overdraft
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* My Applications */}
            <Card>
              <CardHeader><CardTitle>My Applications</CardTitle></CardHeader>
              <CardContent>
                {myApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Requested</TableHead><TableHead>AI Limit</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {myApplications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>UGX {Number(a.requested_amount).toLocaleString()}</TableCell>
                          <TableCell>UGX {Number(a.calculated_limit).toLocaleString()}</TableCell>
                          <TableCell>{a.approved_limit ? `UGX ${Number(a.approved_limit).toLocaleString()}` : '—'}</TableCell>
                          <TableCell>{statusBadge(a.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* My Transactions */}
            {myAccount && (
              <Card>
                <CardHeader><CardTitle>Overdraft Activity</CardTitle></CardHeader>
                <CardContent>
                  {myTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Outstanding After</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {myTransactions.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell>{new Date(t.created_at).toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline">{t.transaction_type}</Badge></TableCell>
                            <TableCell className={t.transaction_type === 'recovery' ? 'text-emerald-700' : 'text-destructive'}>
                              UGX {Number(t.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>UGX {Number(t.balance_after).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ADMIN TAB */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Pending & Recent Applications</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>Requested</TableHead><TableHead>AI Limit</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {allApplications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{a.employee_name || a.employee_email}</TableCell>
                          <TableCell>UGX {Number(a.requested_amount).toLocaleString()}</TableCell>
                          <TableCell>UGX {Number(a.calculated_limit).toLocaleString()}</TableCell>
                          <TableCell>{statusBadge(a.status)}</TableCell>
                          <TableCell>
                            {a.status === 'pending' && (
                              <Button size="sm" onClick={() => { setReviewApp(a); setApproveLimit(String(a.calculated_limit)); setShowApproveDialog(true); }}>Review</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Active Overdraft Accounts</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Employee</TableHead><TableHead>Limit</TableHead><TableHead>Outstanding</TableHead><TableHead>Recovered</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {allAccounts.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.employee_name || a.employee_email}</TableCell>
                          <TableCell>UGX {Number(a.approved_limit).toLocaleString()}</TableCell>
                          <TableCell className={Number(a.outstanding_balance) > 0 ? 'text-destructive font-semibold' : ''}>
                            UGX {Number(a.outstanding_balance).toLocaleString()}
                          </TableCell>
                          <TableCell>UGX {Number(a.total_recovered).toLocaleString()}</TableCell>
                          <TableCell>{statusBadge(a.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply for Overdraft</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">The system will calculate your limit from your wallet activity (avg monthly inflow × 0.5). A 5% activation fee applies on approval.</p>
              <div>
                <Label>Requested Amount (UGX)</Label>
                <Input type="number" value={requestedAmount} onChange={e => setRequestedAmount(e.target.value)} placeholder="e.g. 200000" />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={applyReason} onChange={e => setApplyReason(e.target.value)} placeholder="What you need it for" />
              </div>
              <Button className="w-full" onClick={handleApply} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Draw Dialog */}
        <Dialog open={showDrawDialog} onOpenChange={setShowDrawDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Draw from Overdraft</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {myAccount && (
                <div className="text-sm bg-muted p-3 rounded">
                  <div className="flex justify-between"><span>Available:</span><strong>UGX {Number(myAccount.available_overdraft).toLocaleString()}</strong></div>
                  <div className="flex justify-between"><span>Current outstanding:</span><strong className="text-destructive">UGX {Number(myAccount.outstanding_balance).toLocaleString()}</strong></div>
                </div>
              )}
              <div>
                <Label>Amount (UGX)</Label>
                <Input type="number" value={drawAmount} onChange={e => setDrawAmount(e.target.value)} />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={drawReason} onChange={e => setDrawReason(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleDraw} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Draw Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Admin Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review Overdraft Application</DialogTitle></DialogHeader>
            {reviewApp && (
              <div className="space-y-4">
                <div className="text-sm bg-muted p-3 rounded space-y-1">
                  <div><strong>Employee:</strong> {reviewApp.employee_name || reviewApp.employee_email}</div>
                  <div><strong>Requested:</strong> UGX {Number(reviewApp.requested_amount).toLocaleString()}</div>
                  <div><strong>AI-calculated:</strong> UGX {Number(reviewApp.calculated_limit).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    <strong>Factors:</strong> {JSON.stringify(reviewApp.factors)}
                  </div>
                </div>
                <div>
                  <Label>Approved Limit (UGX)</Label>
                  <Input type="number" value={approveLimit} onChange={e => setApproveLimit(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">5% activation fee = UGX {Math.round((Number(approveLimit) || 0) * 0.05).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Rejection Reason (if rejecting)</Label>
                  <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleApprove('approve')} disabled={submitting}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => handleApprove('reject')} disabled={submitting}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Overdraft;