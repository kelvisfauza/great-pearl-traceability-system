import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, FileSignature, Loader2 } from 'lucide-react';

interface ExpiredContract {
  id: string;
  contract_end_date: string;
  contract_type: string;
  position: string;
  department: string;
}

const ContractRenewalGate = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [expired, setExpired] = useState<ExpiredContract | null>(null);
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState(false);

  const [months, setMonths] = useState(3);
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [emergency, setEmergency] = useState('');
  const [nssf, setNssf] = useState('');
  const [tin, setTin] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ack, setAck] = useState(false);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (!employee?.email) return;
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const [{ data: contracts }, { data: req }] = await Promise.all([
        (supabase as any)
          .from('employee_contracts')
          .select('id, contract_end_date, contract_type, position, department, status')
          .ilike('employee_email', employee.email)
          .lt('contract_end_date', today)
          .order('contract_end_date', { ascending: false })
          .limit(1),
        (supabase as any)
          .from('contract_renewal_requests')
          .select('id, status')
          .ilike('employee_email', employee.email)
          .in('status', ['pending', 'approved'])
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      const pendingOrApproved = (req || [])[0];
      if (pendingOrApproved) {
        if (pendingOrApproved.status === 'pending') setPending(true);
        setChecked(true);
        return;
      }
      const c = (contracts || [])[0];
      if (c) {
        setExpired(c as ExpiredContract);
        setPhone(employee.phone || '');
      }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [employee?.email]);

  const submit = async () => {
    if (!employee || !expired) return;
    if (months < 3 || months > 6) {
      toast({ title: 'Invalid duration', description: 'Renewal must be between 3 and 6 months', variant: 'destructive' });
      return;
    }
    if (reason.trim().length < 10) {
      toast({ title: 'Reason too short', description: 'Please provide at least 10 characters', variant: 'destructive' });
      return;
    }
    if (!ack) {
      toast({ title: 'Acknowledgement required', description: 'Please acknowledge company policies', variant: 'destructive' });
      return;
    }
    if (signature.trim().toLowerCase() !== (employee.name || '').trim().toLowerCase()) {
      toast({ title: 'Signature mismatch', description: 'Type your full legal name exactly as registered', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from('contract_renewal_requests').insert({
      employee_email: employee.email,
      employee_name: employee.name,
      current_contract_id: expired.id,
      requested_months: months,
      reason: reason.trim(),
      updated_phone: phone.trim() || null,
      emergency_contact: emergency.trim() || null,
      nssf_number: nssf.trim() || null,
      tin_number: tin.trim() || null,
      bank_name: bankName.trim() || null,
      bank_account: bankAccount.trim() || null,
      policy_acknowledged: ack,
      signature: signature.trim(),
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Submitted for approval', description: 'Admin will review your renewal request shortly.' });
    setPending(true);
    setExpired(null);
  };

  if (!checked || (!expired && !pending)) return null;

  return (
    <Dialog open modal>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            {pending ? 'Renewal Pending Admin Approval' : 'Contract Renewal Required'}
          </DialogTitle>
          <DialogDescription>
            {pending
              ? 'Your request has been submitted. You will receive an email once approved.'
              : 'Your employment contract has expired. Please complete this form to continue.'}
          </DialogDescription>
        </DialogHeader>

        {pending ? (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Awaiting approval</AlertTitle>
            <AlertDescription>
              The administrator has been notified. You'll regain full system access immediately after approval.
              An email with your renewed contract PDF will be sent to <strong>{employee?.email}</strong>.
            </AlertDescription>
          </Alert>
        ) : (
          expired && (
            <div className="space-y-5">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Contract expired on {new Date(expired.contract_end_date).toLocaleDateString()}</AlertTitle>
                <AlertDescription>
                  {expired.position} — {expired.department}. The system is locked until you submit this renewal form.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Renewal duration: <span className="text-primary font-semibold">{months} month{months > 1 ? 's' : ''}</span></Label>
                <Slider value={[months]} onValueChange={(v) => setMonths(v[0])} min={3} max={6} step={1} />
                <p className="text-xs text-muted-foreground">Minimum 3 months, maximum 6 months</p>
              </div>

              <div className="space-y-2">
                <Label>Reason for renewal *</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly explain why you wish to continue..." rows={3} maxLength={500} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256..." /></div>
                <div><Label>Emergency contact</Label><Input value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Name & phone" /></div>
                <div><Label>NSSF number</Label><Input value={nssf} onChange={(e) => setNssf(e.target.value)} /></div>
                <div><Label>TIN number</Label><Input value={tin} onChange={(e) => setTin(e.target.value)} /></div>
                <div><Label>Bank name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
                <div><Label>Bank account #</Label><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} /></div>
              </div>

              <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/40">
                <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(!!v)} />
                <Label htmlFor="ack" className="text-sm leading-tight cursor-pointer">
                  I acknowledge and agree to abide by all Great Agro Coffee company policies, code of conduct, and the renewed terms of employment.
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Digital signature * <span className="text-xs text-muted-foreground">(type your full legal name)</span></Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={employee?.name} className="font-serif italic" />
              </div>

              <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit for Admin Approval'}
              </Button>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContractRenewalGate;