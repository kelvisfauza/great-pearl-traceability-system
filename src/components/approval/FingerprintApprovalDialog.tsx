import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Loader2, ShieldCheck, Smartphone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  approvalChannelName,
  buildApprovalScanUrl,
  newApprovalSessionId,
  runFingerprintCheck,
} from '@/utils/fingerprintApproval';

export type FingerprintApprovalTarget = {
  title: string;
  amount: number;
  requestId?: string;
  /** Runs once the fingerprint has been confirmed. */
  onConfirmed: () => void | Promise<void>;
};

interface Props {
  target: FingerprintApprovalTarget | null;
  onClose: () => void;
}

/**
 * Money approvals must be confirmed with the approving admin's fingerprint.
 * The admin scans the QR with their phone and touches the sensor there — the
 * phone broadcasts the confirmation back to this laptop over Supabase realtime.
 */
const FingerprintApprovalDialog: React.FC<Props> = ({ target, onClose }) => {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() || '';
  const [sessionId] = useState(newApprovalSessionId);
  const [qr, setQr] = useState<string>('');
  const [phone, setPhone] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  const scanUrl = email ? buildApprovalScanUrl(sessionId, email) : '';

  useEffect(() => {
    if (!scanUrl) return;
    QRCode.toDataURL(scanUrl, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [scanUrl]);

  const complete = async (via: string) => {
    if (confirmed) return;
    setConfirmed(true);
    toast.success(`Approval confirmed with fingerprint (${via})`);
    try {
      await targetRef.current?.onConfirmed();
    } finally {
      onClose();
    }
  };

  // Listen for the phone's confirmation for this approval session.
  useEffect(() => {
    if (!target) return;
    const channel = supabase
      .channel(approvalChannelName(sessionId), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'hello' }, ({ payload }: any) => {
        setPhone(payload?.device || 'Phone');
      })
      .on('broadcast', { event: 'approved' }, ({ payload }: any) => {
        complete(payload?.device || 'phone');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'request',
            payload: {
              title: targetRef.current?.title,
              amount: targetRef.current?.amount,
              requestId: targetRef.current?.requestId,
            },
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, !!target]);

  // Re-broadcast the request details whenever the phone announces itself.
  useEffect(() => {
    if (!phone || !target) return;
    const channel = supabase.channel(approvalChannelName(sessionId));
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'request',
          payload: { title: target.title, amount: target.amount, requestId: target.requestId },
        });
        setTimeout(() => supabase.removeChannel(channel), 1500);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const approveOnThisDevice = async () => {
    if (!email) return;
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
          context: { title: target?.title, amount: target?.amount, request_id: target?.requestId, via: 'laptop' },
        },
      });
      if (!fin?.ok) throw new Error(fin?.error || 'Fingerprint not recognized.');
      await complete('this device');
    } catch (err: any) {
      toast.error(err?.message || 'Fingerprint approval failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Confirm with your fingerprint
          </DialogTitle>
          <DialogDescription>
            Money approvals need your fingerprint. Scan this code with your phone and touch the
            sensor there.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm">{target?.title}</p>
            <p className="text-xl font-bold">UGX {(target?.amount || 0).toLocaleString()}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {confirmed ? (
              <div className="flex flex-col items-center gap-2 py-8 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
                <p className="text-sm font-medium">Fingerprint confirmed — approving…</p>
              </div>
            ) : qr ? (
              <img src={qr} alt="Scan to approve with your phone fingerprint" className="h-52 w-52 rounded-lg border bg-white p-2" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground my-12" />
            )}
            {!confirmed && (
              <p className="text-xs text-muted-foreground text-center break-all">{scanUrl}</p>
            )}
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {phone ? (
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> {phone} connected — waiting for your touch.
                </span>
              ) : (
                'Waiting for your phone… your fingerprint never leaves your device.'
              )}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy || confirmed}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={approveOnThisDevice} disabled={busy || confirmed}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              Use this device instead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FingerprintApprovalDialog;
