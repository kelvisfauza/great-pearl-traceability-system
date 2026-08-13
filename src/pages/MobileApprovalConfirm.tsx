import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  approvalChannelName,
  describeDevice,
  runFingerprintCheck,
} from '@/utils/fingerprintApproval';

/**
 * Phone-side page reached by scanning the QR shown on the approvals screen.
 * The admin touches their fingerprint sensor here and the confirmation is
 * broadcast back to the laptop that is holding the approval.
 */
const MobileApprovalConfirm: React.FC = () => {
  const { sessionId = '' } = useParams();
  const [params] = useSearchParams();
  const email = (params.get('e') || '').toLowerCase().trim();
  const channelRef = useRef<any>(null);
  const [request, setRequest] = useState<{ title?: string; amount?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const device = describeDevice();

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(approvalChannelName(sessionId), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'request' }, ({ payload }: any) => setRequest(payload || null))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'hello', payload: { device } });
        }
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const approve = async () => {
    if (!email) {
      toast.error('This approval link is incomplete. Re-scan the code on your laptop.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke('fingerprint-approve', {
        body: { action: 'begin', email },
      });
      if (!data?.ok) throw new Error(data?.error || 'Could not start fingerprint approval.');

      const rawId = await runFingerprintCheck(data.credential_id);

      const { data: fin } = await supabase.functions.invoke('fingerprint-approve', {
        body: {
          action: 'finish',
          email,
          credential_id: rawId,
          context: { ...(request || {}), session_id: sessionId, via: 'phone', device },
        },
      });
      if (!fin?.ok) throw new Error(fin?.error || 'Fingerprint not recognized.');

      await channelRef.current?.send({
        type: 'broadcast',
        event: 'approved',
        payload: { device, email, at: new Date().toISOString() },
      });
      setDone(true);
      toast.success('Approved — you can go back to your laptop.');
    } catch (err: any) {
      const name = err?.name;
      toast.error(
        name === 'NotAllowedError'
          ? 'The fingerprint prompt was cancelled or timed out.'
          : err?.message || 'Fingerprint approval failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fingerprint className="h-5 w-5 text-primary" />
            Approve with fingerprint
          </CardTitle>
          <CardDescription>{email || 'Unknown approver'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">{request?.title || 'Waiting for request details…'}</p>
            {typeof request?.amount === 'number' && (
              <p className="text-2xl font-bold">UGX {request.amount.toLocaleString()}</p>
            )}
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your fingerprint stays on this phone — only a device key reference is checked.
            </AlertDescription>
          </Alert>

          {done ? (
            <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
              <p className="text-sm font-medium">Approved on your laptop</p>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={approve} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
              Touch to approve
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default MobileApprovalConfirm;
