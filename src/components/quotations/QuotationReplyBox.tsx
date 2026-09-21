import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  quotationId: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  defaultSubject?: string;
  defaultMessage?: string;
  notify: (opts: { quotationId: string; subject: string; message: string; sendEmail: boolean; sendSms: boolean }) => Promise<unknown>;
}

const QuotationReplyBox = ({ quotationId, companyEmail, companyPhone, defaultSubject = 'Regarding your quotation', defaultMessage = '', notify }: Props) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sendEmail, setSendEmail] = useState(!!companyEmail);
  const [sendSms, setSendSms] = useState(!!companyPhone);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) {
      toast({ title: 'Write a message first', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await notify({ quotationId, subject, message: message.trim(), sendEmail, sendSms });
      toast({ title: 'Reply sent to the company' });
      setMessage('');
    } catch (err) {
      toast({ title: 'Could not send the reply', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
      <div>
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <Label>Message to the company</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={900} placeholder="e.g. Kindly revise your unit prices and resend the quotation by Friday." />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/900 characters</p>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} disabled={!companyEmail} />
          Email {companyEmail ? `(${companyEmail})` : '(no address on file)'}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sendSms} onCheckedChange={(v) => setSendSms(!!v)} disabled={!companyPhone} />
          Text message {companyPhone ? `(${companyPhone})` : '(no number on file)'}
        </label>
        <Button size="sm" className="ml-auto" onClick={send} disabled={sending || (!sendEmail && !sendSms)}>
          {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send reply
        </Button>
      </div>
    </div>
  );
};

export default QuotationReplyBox;
