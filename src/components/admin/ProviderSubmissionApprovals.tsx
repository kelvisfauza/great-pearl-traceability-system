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
    setProcessing(selected.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: {
          submissionId: selected.id,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
          withdrawCharge: action === 'approve' ? Number(withdrawCharge || 0) : undefined,
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
        const numAmount = Number(selected.amount);
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
      setApproveOpen(false);
      setRejectOpen(false);
      setSelected(null);
      setWithdrawCharge('');
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
                    onClick={() => { setSelected(s); setWithdrawCharge(''); setApproveOpen(true); }}
                    disabled={processing === s.id}
                  >
                    {processing === s.id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Approve & Pay
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