import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Reply, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const QUICK_REPLIES = [
  'We have received your request. Kindly give us some time as we review it.',
  'Your request is being processed. Payment will be made soon, thank you for your patience.',
  'Please send us a clear invoice or receipt for this request.',
  'Please confirm the amount and the work done so we can proceed.',
  'Please call our office for clarification on this request.',
];

export default function ProviderReplyDialog({ submissionId, title }: { submissionId: string; title: string }) {
  const { toast } = useToast();
  const { employee, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const message = text.trim();
    if (!message) return toast({ title: 'Type a reply first', variant: 'destructive' });
    setSending(true);
    try {
      const { data: sub, error } = await (supabase as any)
        .from('provider_submission_requests')
        .select('provider_name, phone, email')
        .eq('id', submissionId)
        .maybeSingle();
      if (error || !sub) throw new Error('Could not load the provider details');
      const sender = (employee as any)?.name || user?.email || 'Procurement';
      const smsBody = `Dear ${sub.provider_name}, Great Agro Coffee Procurement: ${message}`;
      const results: string[] = [];

      if (sub.phone) {
        const { error: smsErr } = await supabase.functions.invoke('send-sms', {
          body: { phone: sub.phone, message: smsBody, userName: sub.provider_name, messageType: 'provider_message', department: 'Procurement', requestId: submissionId },
        });
        results.push(smsErr ? 'text failed' : 'text sent');
      }
      if (sub.email) {
        const { error: mailErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: sub.email,
            idempotencyKey: `provider-reply-${submissionId}-${Date.now()}`,
            templateData: {
              title: 'Update on your request',
              subject: `Update on your request: ${title}`,
              message: `Dear ${sub.provider_name},\n\n${message}\n\nRegards,\n${sender}\nProcurement, Great Agro Coffee`,
            },
          },
        });
        results.push(mailErr ? 'email failed' : 'email sent');
      }
      if (!results.length) throw new Error('This provider has no phone number or email on the request');

      await supabase.from('audit_logs').insert({
        action: 'PROVIDER_REPLY',
        table_name: 'provider_submission_requests',
        record_id: submissionId,
        performed_by: sender,
        department: 'Procurement',
        reason: message,
        record_data: { provider: sub.provider_name, phone: sub.phone, email: sub.email, results },
      } as any);

      toast({ title: 'Reply sent to provider', description: results.join(' · ') });
      setOpen(false);
      setText('');
    } catch (e: any) {
      toast({ title: 'Reply not sent', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Reply className="h-4 w-4 mr-2" /> Reply to sender
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to provider</DialogTitle>
            <DialogDescription>Sent by text and email to the provider. The request stays in your queue.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <Badge key={q} variant="outline" className="cursor-pointer font-normal" onClick={() => setText(q)}>
                {q}
              </Badge>
            ))}
          </div>
          <Textarea rows={4} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your reply..." />
          <p className="text-xs text-muted-foreground">{text.length}/300</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Reply className="h-4 w-4 mr-2" />} Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
