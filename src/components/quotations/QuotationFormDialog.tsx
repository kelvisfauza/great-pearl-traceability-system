import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const MAX_MB = 10;

interface Props {
  onCreate: (payload: Record<string, unknown>, file: File | null, submitter: { name?: string | null; email?: string | null }) => Promise<void>;
}

const QuotationFormDialog = ({ onCreate }: Props) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setCompany(''); setContact(''); setEmail(''); setPhone('');
    setSubject(''); setAmount(''); setNotes(''); setFile(null);
  };

  const submit = async () => {
    if (!company.trim() || !subject.trim()) {
      toast({ title: 'Company name and subject are required', variant: 'destructive' });
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `The file is larger than ${MAX_MB}MB`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onCreate(
        {
          company_name: company.trim(),
          contact_name: contact.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          subject: subject.trim(),
          amount: amount ? Number(amount) : null,
          currency: 'UGX',
          notes: notes.trim() || null,
        },
        file,
        { name: employee?.name, email: employee?.email },
      );
      toast({ title: 'Quotation added', description: 'It is now with procurement for review.' });
      reset();
      setOpen(false);
    } catch (err) {
      toast({ title: 'Could not save the quotation', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add quotation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New quotation</DialogTitle>
          <DialogDescription>Record the company's details and attach their quotation document.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company / supplier name *</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Kasese Hardware Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact person</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>What the quotation is for *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Supply of tarpaulins" />
          </div>
          <div>
            <Label>Quoted amount (UGX)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Attach quotation (PDF, Word or photo — max {MAX_MB}MB)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
