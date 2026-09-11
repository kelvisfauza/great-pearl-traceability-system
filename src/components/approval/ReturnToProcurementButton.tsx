import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  sourceTable: 'approval_requests' | 'provider_submission_requests';
  recordId: string;
  title: string;
  requestedBy?: string | null;
  amount?: number | string | null;
  disabled?: boolean;
  size?: 'sm' | 'default';
  onReturned?: () => void;
}

/**
 * Admin action: send a money request back to the procurement office for
 * corrections (quantity, amount, details). Procurement is alerted by email + SMS
 * and can edit and re-submit the request for approval.
 */
const ReturnToProcurementButton = ({ sourceTable, recordId, title, requestedBy, amount, disabled, size = 'default', onReturned }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_return_to_procurement', {
        _source_table: sourceTable,
        _record_id: recordId,
        _reason: reason.trim(),
        _request_title: title,
        _requested_by: requestedBy || null,
        _amount: Number(amount || 0),
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error);

      supabase.functions
        .invoke('procurement-review-notify', { body: { mode: 'returned', source_table: sourceTable, record_id: recordId } })
        .catch((e) => console.error('Procurement return notification failed:', e));

      toast({
        title: 'Sent back to procurement',
        description: 'Procurement has been notified by email and SMS to make the changes.',
      });
      setOpen(false);
      setReason('');
      onReturned?.();
    } catch (err: any) {
      toast({ title: 'Could not send back', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
      >
        <Undo2 className="h-4 w-4 mr-2" />
        Send back to Procurement
      </Button>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-600" /> Send back to Procurement
            </DialogTitle>
            <DialogDescription>
              {title}. Tell procurement exactly what to review or change (quantity, amount, supplier, details). They will be
              emailed and texted, and the request will return to you after they edit it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="return-reason">What should procurement change? *</Label>
            <Textarea
              id="return-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. The number of meals looks too high — confirm headcount with the provider and adjust the amount."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !reason.trim()} className="bg-amber-600 hover:bg-amber-700">
              {saving ? 'Sending…' : 'Send back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReturnToProcurementButton;
