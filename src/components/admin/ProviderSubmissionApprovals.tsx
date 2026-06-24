import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Inbox, Loader2, Check, X, Copy, ExternalLink } from 'lucide-react';
import { printProviderAcknowledgement } from '@/utils/printProviderAcknowledgement';

const ProviderSubmissionApprovals: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [withdrawCharge, setWithdrawCharge] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['provider-submissions-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_submission_requests' as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const publicLink = `${window.location.origin}/submit-request`;

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    const finalAmount = action === 'approve'
      ? Number(overrideAmount || selected.amount)
      : Number(selected.amount);
    if (action === 'approve' && (!finalAmount || finalAmount < 500)) {
      toast({ title: 'Invalid amount', description: 'Amount must be at least 500 UGX', variant: 'destructive' });
      return;
    }
    setProcessing(selected.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: {
          submissionId: selected.id,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
          withdrawCharge: action === 'approve' ? Number(withdrawCharge || 0) : undefined,
          amountOverride: action === 'approve' && Number(overrideAmount) > 0 && Number(overrideAmount) !== Number(selected.amount)
            ? Number(overrideAmount)
            : undefined,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Action failed');

      toast({
        title: action === 'approve' ? 'Approved' : 'Rejected',
        description: (data as any)?.message || `Request ${action}d successfully`,
      });

      // On successful approval, open printable acknowledgement form
      if (action === 'approve') {
        const ref = ((data as any)?.ref || (data as any)?.recordId || selected.id)
          .toString().slice(-8).toUpperCase();
        const numAmount = finalAmount;
        const numCharge = Number(withdrawCharge || 0);
        printProviderAcknowledgement({
          providerName: selected.provider_name,
          phone: selected.phone,
          email: selected.email,
          description: selected.description,
          invoiceNumber: selected.invoice_number,
          amount: numAmount,
          charges: numCharge,
          total: numAmount + numCharge,
          reference: ref,
          transactionId: (data as any)?.ref || null,
          requestType: selected.request_type === 'meal_plan' ? 'meal_plan' : 'service_provider',
          processedBy: 'Finance / Admin',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['provider-submissions-pending'] });
      queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['meal-disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['support-staff-per-diem'] });
      setApproveOpen(false);
      setRejectOpen(false);
      setSelected(null);
      setWithdrawCharge('');
      setOverrideAmount('');
      setRejectionReason('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicLink);
    toast({ title: 'Link copied', description: 'Share with service providers' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          <CardTitle>Self-Submitted Provider Requests</CardTitle>
          {submissions.length > 0 && (
            <Badge variant="secondary">{submissions.length} pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={publicLink} className="w-72 text-xs" />
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={publicLink} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" /> Open
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No pending self-submitted requests. Share the link above with providers.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.provider_name}</p>
                      <Badge variant={s.request_type === 'meal_plan' ? 'secondary' : 'default'}>
                        {s.request_type === 'meal_plan' ? 'Meal Plan' : 'Service Provider'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.phone} {s.email && `• ${s.email}`}</p>
                    {s.invoice_number && <p className="text-xs text-muted-foreground">Invoice: {s.invoice_number}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">UGX {Number(s.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm bg-muted/50 p-2 rounded">{s.description}</p>
                {s.payout_status === 'failed' && (
                  <div className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded px-2 py-1.5">
                    <strong>Previous payout failed.</strong>{' '}
                    {s.payout_message || 'Yo Payments rejected the disbursement (often: account not funded).'}{' '}
                    Top up the Yo wallet, then click <em>Approve &amp; Pay</em> again to retry — no duplicate record will be created.
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelected(s); setRejectionReason(''); setRejectOpen(true); }}
                    disabled={processing === s.id}
                  >
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setSelected(s); setWithdrawCharge(''); setOverrideAmount(String(s.amount || '')); setApproveOpen(true); }}
                    disabled={processing === s.id}
                  >
                    {processing === s.id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {s.payout_status === 'failed' ? 'Retry Payout' : 'Approve & Pay'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Disburse</DialogTitle>
            <DialogDescription>
              {selected && `Send UGX ${Number(selected.amount).toLocaleString()} to ${selected.provider_name} (${selected.phone}). Yo Payments will be triggered immediately.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selected && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Provider:</span> <strong>{selected.provider_name}</strong></p>
                <p><span className="text-muted-foreground">Phone:</span> {selected.phone}</p>
                <p><span className="text-muted-foreground">Description:</span> {selected.description}</p>
                {selected.invoice_number && (
                  <p><span className="text-muted-foreground">Invoice:</span> {selected.invoice_number}</p>
                )}
                <p><span className="text-muted-foreground">Requested amount:</span> <strong>UGX {Number(selected.amount).toLocaleString()}</strong></p>
              </div>
            )}
            <div>
              <Label>Amount to Send (UGX)</Label>
              <Input
                type="number"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder={selected ? String(selected.amount) : '0'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can adjust the amount before disbursing if the request needs correction.
              </p>
            </div>
            <div>
              <Label>Withdraw Charge (optional, UGX)</Label>
              <Input
                type="number"
                value={withdrawCharge}
                onChange={(e) => setWithdrawCharge(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Added to the amount sent (covers MoMo fees).
              </p>
            </div>
            {(Number(overrideAmount) > 0 || Number(withdrawCharge) > 0) && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>UGX {Number(overrideAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Withdraw Charge:</span>
                  <span>UGX {Number(withdrawCharge || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total to Send:</span>
                  <span>UGX {(Number(overrideAmount || 0) + Number(withdrawCharge || 0)).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAction('approve')} disabled={!!processing}>
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Confirm & Disburse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              {selected && `Reject request from ${selected.provider_name}?`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Why is this being rejected?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleAction('reject')} disabled={!!processing}>
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProviderSubmissionApprovals;