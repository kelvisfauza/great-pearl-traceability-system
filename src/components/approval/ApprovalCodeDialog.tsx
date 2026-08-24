import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, MessageSquare } from 'lucide-react';

export interface ApprovalCodeTarget {
  /** Logical grouping, e.g. 'provider_submission' */
  targetType: string;
  /** Unique id of the thing being approved */
  targetId: string;
  /** Human label used in the SMS text */
  label: string;
  amount?: number;
  onVerified: () => void;
}

interface Props {
  target: ApprovalCodeTarget | null;
  onClose: () => void;
}

/**
 * Sends a 6-digit approval code to the signed-in admin's phone (BulkSMS.com)
 * and only calls `onVerified()` once the code is entered correctly.
 */
const ApprovalCodeDialog: React.FC<Props> = ({ target, onClose }) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (target) {
      setCode('');
      setSentTo(null);
      void sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.targetId]);

  const sendCode = async () => {
    if (!target) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-approval-code', {
        body: {
          action: 'send',
          targetType: target.targetType,
          targetId: target.targetId,
          label: target.label,
          amount: target.amount,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed to send code');
      setSentTo((data as any).phone || null);
      toast({ title: 'Code sent', description: `Approval code sent by SMS to ${(data as any).phone || 'your phone'}` });
    } catch (e: any) {
      toast({ title: 'Could not send code', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!target) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-approval-code', {
        body: {
          action: 'verify',
          targetType: target.targetType,
          targetId: target.targetId,
          code: code.trim(),
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Verification failed');
      const cb = target.onVerified;
      onClose();
      cb();
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Approve by code
          </DialogTitle>
          <DialogDescription>
            {target?.label}
            {target?.amount ? ` — UGX ${Number(target.amount).toLocaleString()}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {sending
              ? 'Sending a 6-digit approval code to your phone…'
              : sentTo
                ? `Enter the 6-digit code sent to ${sentTo}. It expires in 10 minutes.`
                : 'Request a code to continue.'}
          </p>
          <div>
            <Label className="text-xs">Approval code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="text-center text-lg tracking-[0.4em] font-mono"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="sm" onClick={sendCode} disabled={sending}>
            {sending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
            Resend code
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={verifying}>Cancel</Button>
          <Button onClick={verify} disabled={verifying || code.length !== 6}>
            {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Verify & Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalCodeDialog;
