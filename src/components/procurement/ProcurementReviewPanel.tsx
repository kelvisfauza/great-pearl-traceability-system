import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, RefreshCw, Pencil, ClipboardCheck, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PENDING_STATUSES = [
  'Pending',
  'Pending Admin',
  'Pending Admin Approval',
  'Pending Admin 2',
  'Pending Finance',
  'Finance Approved',
];

interface PendingRequest {
  source_table: string;
  id: string;
  title: string;
  type: string;
  description: string | null;
  amount: number | null;
  requestedby: string | null;
  requestedby_name: string | null;
  department: string | null;
  daterequested: string | null;
  status: string;
  created_at: string;
}

interface AdminOption {
  name: string;
  email: string;
}

interface ReviewRow {
  source_table: string;
  record_id: string;
  decision: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  recommended_admin_name: string | null;
  recommended_admin_email: string | null;
  edited_amount: number | null;
  original_amount: number | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  meal_plan: 'Meal Plan',
  service_provider: 'Service Provider Payment',
  support_staff_per_diem: 'Support Staff Per Diem',
};

const money = (v: unknown) => `UGX ${Number(v || 0).toLocaleString('en-UG')}`;

const ProcurementReviewPanel = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialog, setDialog] = useState<{
    open: boolean;
    request: PendingRequest | null;
    decision: 'approved' | 'rejected';
  }>({ open: false, request: null, decision: 'approved' });
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ data: reqs }, { data: providers }, { data: revs }, { data: staff }] = await Promise.all([
        (supabase as any)
          .from('approval_requests')
          .select('id,title,type,description,amount,requestedby,requestedby_name,department,daterequested,status,created_at')
          .in('status', PENDING_STATUSES)
          .order('created_at', { ascending: false })
          .limit(200),
        (supabase as any)
          .from('provider_submission_requests')
          .select('id,request_type,provider_name,phone,amount,description,status,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(200),
        (supabase as any)
          .from('procurement_reviews')
          .select('source_table,record_id,decision,notes,reviewed_by,reviewed_at,recommended_admin_name,recommended_admin_email,edited_amount,original_amount'),
        (supabase as any)
          .from('employees')
          .select('name,email,role,disabled')
          .not('email', 'is', null),
      ]);

      const approvalRows: PendingRequest[] = ((reqs || []) as any[])
        .filter((r) => String(r.type || '').toLowerCase() !== 'leave')
        .map((r) => ({ ...r, source_table: 'approval_requests' }));

      const providerRows: PendingRequest[] = ((providers || []) as any[]).map((r) => ({
        source_table: 'provider_submission_requests',
        id: r.id,
        title: `${PROVIDER_LABEL[String(r.request_type)] || 'Provider Request'} — ${r.provider_name || 'Unnamed'}`,
        type: PROVIDER_LABEL[String(r.request_type)] || String(r.request_type || 'Provider Request'),
        description: r.description || null,
        amount: r.amount,
        requestedby: r.phone || null,
        requestedby_name: r.provider_name || null,
        department: 'Procurement',
        daterequested: null,
        status: r.status,
        created_at: r.created_at,
      }));

      setRequests([...providerRows, ...approvalRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ));

      const map: Record<string, ReviewRow> = {};
      ((revs || []) as ReviewRow[]).forEach((r) => { map[`${r.source_table}:${r.record_id}`] = r; });
      setReviews(map);

      setAdmins(
        ((staff || []) as any[])
          .filter((s) => s.disabled !== true && String(s.role || '').toLowerCase().includes('admin') && s.email)
          .map((s) => ({ name: s.name || s.email, email: String(s.email).toLowerCase() })),
      );
    } catch (err) {
      console.error('Failed to load procurement review queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingCount = useMemo(
    () => requests.filter((r) => (reviews[`${r.source_table}:${r.id}`]?.decision || 'pending') === 'pending').length,
    [requests, reviews],
  );

  const openDialog = (request: PendingRequest, decision: 'approved' | 'rejected') => {
    const existing = reviews[`${request.source_table}:${request.id}`];
    setDialog({ open: true, request, decision });
    setNotes(existing?.notes || '');
    setAmount(String(request.amount ?? ''));
    setDescription(request.description || '');
    setAdminEmail(existing?.recommended_admin_email || '');
  };

  const submit = async () => {
    if (!dialog.request) return;
    setSaving(true);
    try {
      const editedAmount = Number(amount);
      const changedAmount = editedAmount > 0 && editedAmount !== Number(dialog.request.amount || 0);
      const changedDescription = description !== (dialog.request.description || '');

      const { data, error } = await (supabase as any).rpc('submit_procurement_review', {
        _source_table: dialog.request.source_table,
        _record_id: dialog.request.id,
        _decision: dialog.decision,
        _notes: notes || null,
        _recommended_admin_email: adminEmail || null,
        _recommended_admin_name: admins.find((a) => a.email === adminEmail)?.name || null,
        _edited_amount: changedAmount ? editedAmount : null,
        _edited_description: changedDescription ? description : null,
        _request_title: dialog.request.title,
        _requested_by: dialog.request.requestedby_name || dialog.request.requestedby,
        _amount: Number(dialog.request.amount || 0),
      });

      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error);

      // Show the decision immediately, before the reload finishes
      const key = `${dialog.request.source_table}:${dialog.request.id}`;
      setReviews((prev) => ({
        ...prev,
        [key]: {
          source_table: dialog.request!.source_table,
          record_id: dialog.request!.id,
          decision: dialog.decision,
          notes: notes || null,
          reviewed_by: prev[key]?.reviewed_by || 'You',
          reviewed_at: new Date().toISOString(),
          recommended_admin_name: admins.find((a) => a.email === adminEmail)?.name || null,
          recommended_admin_email: adminEmail || null,
          edited_amount: changedAmount ? editedAmount : null,
          original_amount: Number(dialog.request!.amount || 0),
        },
      }));

      // Notify the chosen administrator (email + SMS)
      supabase.functions.invoke('procurement-review-notify', {
        body: { mode: 'reviewed', source_table: dialog.request.source_table, record_id: dialog.request.id },
      }).catch((e) => console.error('Admin notification failed:', e));

      toast({
        title: dialog.decision === 'approved' ? 'Cleared for admin approval' : 'Rejected at procurement',
        description: adminEmail
          ? `${admins.find((a) => a.email === adminEmail)?.name || adminEmail} has been notified by email and SMS.`
          : 'All administrators have been notified by email and SMS.',
      });

      setDialog({ open: false, request: null, decision: 'approved' });
      await load();

    } catch (err: any) {
      console.error('Procurement review failed:', err);
      toast({ title: 'Review failed', description: err?.message || 'Could not save this review', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const decisionBadge = (decision: string) => {
    if (decision === 'approved') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Cleared by procurement</Badge>;
    if (decision === 'rejected') return <Badge variant="destructive">Rejected at procurement</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Awaiting your review</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              <CardTitle>Procurement Review — First Stage</CardTitle>
            </div>
            <CardDescription>
              Check meal plans, service provider payments, requisitions and other money requests before they
              reach administration. You can correct the amount or details, then choose which administrator approves.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{pendingCount} awaiting review</Badge>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">No money requests are waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const review = reviews[`${request.source_table}:${request.id}`];
              const decision = review?.decision || 'pending';
              return (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{request.title}</p>
                        <Badge variant="outline">{request.type}</Badge>
                        {decisionBadge(decision)}
                      </div>
                      {request.description && (
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                      )}
                    </div>
                    <p className="text-lg font-semibold whitespace-nowrap">{money(request.amount)}</p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.requestedby_name || request.requestedby || 'Unknown'} · {request.department || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {request.daterequested || new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {review && decision !== 'pending' && (
                    <div className="text-xs bg-muted rounded p-2 space-y-1">
                      <p><strong>Reviewed by:</strong> {review.reviewed_by} · {review.reviewed_at ? new Date(review.reviewed_at).toLocaleString() : ''}</p>
                      {review.recommended_admin_name && <p><strong>Sent to:</strong> {review.recommended_admin_name}</p>}
                      {review.notes && <p><strong>Observations:</strong> {review.notes}</p>}
                      {review.edited_amount != null && (
                        <p><strong>Amount corrected:</strong> {money(review.original_amount)} → {money(review.edited_amount)}</p>
                      )}
                      <p><strong>Current stage:</strong> {request.status}</p>
                    </div>
                  )}

                  {decision === 'pending' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openDialog(request, 'approved')}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Approve &amp; send to admin
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDialog(request, 'rejected')}>
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDialog(request, 'approved')}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit details
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Your decision is final and cannot be changed. You can only follow this request from here.
                    </p>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => !open && setDialog({ open: false, request: null, decision: 'approved' })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog.decision === 'approved' ? 'Clear request for administration' : 'Reject request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={dialog.decision === 'rejected'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Correct the amount if the request was filed wrongly. The admin sees your correction.
              </p>
            </div>
            <div>
              <Label>Request details</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={dialog.decision === 'rejected'}
              />
            </div>
            <div>
              <Label>{dialog.decision === 'approved' ? 'Your observations for the admin' : 'Reason for rejection'}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did you verify or find?" />
            </div>
            {dialog.decision === 'approved' && (
              <div>
                <Label>Send to which administrator?</Label>
                <Select value={adminEmail} onValueChange={setAdminEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="All administrators" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map((a) => (
                      <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  They receive an email and SMS immediately. Leave empty to notify all administrators.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, request: null, decision: 'approved' })}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving || (dialog.decision === 'rejected' && !notes.trim())}
              className={dialog.decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={dialog.decision === 'rejected' ? 'destructive' : 'default'}
            >
              {saving ? 'Saving...' : dialog.decision === 'approved' ? 'Approve & notify admin' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProcurementReviewPanel;
