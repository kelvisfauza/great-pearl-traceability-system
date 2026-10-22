import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Landmark } from 'lucide-react';

const SNOOZE_KEY = 'bank-details-snooze';

/** Asks employees without bank details on file to submit them (salary moves to bank payment). */
const BankDetailsPrompt = () => {
  const { employee, fetchEmployeeData } = useAuth() as any;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_name: '', account_number: '' });

  useEffect(() => {
    if (!employee?.authUserId || employee.id === 'main-admin') return;
    if (sessionStorage.getItem(SNOOZE_KEY)) return;
    (async () => {
      const { data } = (await supabase
        .from('employees')
        .select('bank_name, account_name, account_number, name, profile_completed')
        .eq('auth_user_id', employee.authUserId)
        .maybeSingle()) as { data: any };
      if (!data || !data.profile_completed) return; // profile wizard collects it first
      if (!String(data.bank_name || '').trim() || !String(data.account_number || '').trim()) {
        setForm({ bank_name: data.bank_name || '', account_name: data.account_name || data.name || '', account_number: data.account_number || '' });
        setOpen(true);
      }
    })();
  }, [employee?.authUserId]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('update_own_bank_details', {
      _bank_name: form.bank_name, _account_name: form.account_name, _account_number: form.account_number,
    });
    setSaving(false);
    if (error || data?.success === false) {
      toast({ title: 'Could not save', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Bank details saved', description: 'Thank you. Your salary will be paid to this account.' });
    setOpen(false);
    if (fetchEmployeeData) await fetchEmployeeData();
  };

  const later = () => { sessionStorage.setItem(SNOOZE_KEY, '1'); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Submit your bank account</DialogTitle>
          <DialogDescription>
            From next month, salaries will be paid through the bank. Please enter your bank account details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Bank name</Label>
            <Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. Stanbic Bank" /></div>
          <div className="space-y-1"><Label>Account name</Label>
            <Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="Name on the account" /></div>
          <div className="space-y-1"><Label>Account number</Label>
            <Input inputMode="numeric" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={later}>Later</Button>
          <Button onClick={save} disabled={saving || !form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()}>
            {saving ? 'Saving…' : 'Save bank details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BankDetailsPrompt;
