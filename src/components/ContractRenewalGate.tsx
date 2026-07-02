import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, FileSignature, Loader2, MessageSquare } from 'lucide-react';

const TERMS = [
  'I confirm that all information provided in this renewal form is true, accurate, and complete to the best of my knowledge.',
  'I agree to continue serving Great Agro Coffee diligently and to uphold the company\'s code of conduct, confidentiality, and anti-fraud policies.',
  'I understand that this renewal is for a fixed term of 3–6 months and does not constitute a permanent employment guarantee.',
  'I authorise the company to deduct any verified statutory contributions (PAYE, NSSF, LST) and recoverable advances or penalties from my salary or wallet.',
  'I accept that breach of company policy, falsification of records, or unauthorised disclosure of company information may lead to disciplinary action or termination.',
  'I agree that my contract data, banking details, and statutory numbers may be processed and stored securely for HR, payroll, and compliance purposes.',
  'I acknowledge that this renewal becomes binding only upon written approval by the Administrator and receipt of the signed contract via email.',
];

interface ExpiredContract {
  id: string | null;
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
  const [negotiating, setNegotiating] = useState(false);
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
  const [terms, setTerms] = useState(false);
  const [signature, setSignature] = useState('');

  // Negotiation fields
  const [reqSalary, setReqSalary] = useState('');
  const [reqPosition, setReqPosition] = useState('');
  const [reqRoleChanges, setReqRoleChanges] = useState('');
  const [reqOtherTerms, setReqOtherTerms] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');

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
          .order('contract_end_date', { ascending: false })
          .limit(1),
        (supabase as any)
          .from('contract_renewal_requests')
          .select('id, status')
          .ilike('employee_email', employee.email)
          .in('status', ['pending', 'negotiating', 'approved'])
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      const pendingOrApproved = (req || [])[0];
      if (pendingOrApproved) {
        if (pendingOrApproved.status === 'pending') setPending(true);
        else if (pendingOrApproved.status === 'negotiating') setNegotiating(true);
        setChecked(true);
        return;
      }
      const c = (contracts || [])[0];
      const todayDate = new Date(today);
      if (c && c.contract_end_date && new Date(c.contract_end_date) < todayDate) {
        // Has an actual expired contract row
        setExpired(c as ExpiredContract);
        setPhone(employee.phone || '');
      } else if (!c) {
        // No contract row at all — derive expiry from join_date + 6 months
        const join = (employee as any).join_date || (employee as any).created_at;
        if (join) {
          const derivedEnd = new Date(join);
          derivedEnd.setMonth(derivedEnd.getMonth() + 6);
          if (derivedEnd < todayDate) {
            setExpired({
              id: null,
              contract_end_date: derivedEnd.toISOString().split('T')[0],
              contract_type: 'Fixed Term (provisional)',
              position: (employee as any).position || 'N/A',
              department: (employee as any).department || 'N/A',
            });
            setPhone(employee.phone || '');
          }
        }
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
    if (!terms) {
      toast({ title: 'Terms not accepted', description: 'You must accept the Terms & Conditions to continue', variant: 'destructive' });
      return;
    }
    if (signature.trim().toLowerCase() !== (employee.name || '').trim().toLowerCase()) {
      toast({ title: 'Signature mismatch', description: 'Type your full legal name exactly as registered', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('submit-contract-renewal', {
      body: {
        mode: 'accept',
      current_contract_id: expired.id, // may be null for provisional/derived contracts
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
      },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      toast({ title: 'Submission failed', description: data?.error || error?.message || 'Could not submit renewal request', variant: 'destructive' });
      return;
    }
    toast({ title: 'Submitted for approval', description: 'Admin will review your renewal request shortly.' });
    setPending(true);
    setExpired(null);
  };

  const submitNegotiation = async () => {
    if (!employee || !expired) return;
    if (months < 3 || months > 6) {
      toast({ title: 'Invalid duration', description: 'Renewal must be between 3 and 6 months', variant: 'destructive' });
      return;
    }
    const hasAnyChange =
      reqSalary.trim() || reqPosition.trim() || reqRoleChanges.trim() || reqOtherTerms.trim();
    if (!hasAnyChange) {
      toast({ title: 'No changes specified', description: 'Fill at least one requested change field', variant: 'destructive' });
      return;
    }
    if (negotiationNotes.trim().length < 10) {
      toast({ title: 'Justification too short', description: 'Please explain your request (10+ characters)', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const grace = new Date();
    grace.setDate(grace.getDate() + 7);
    const { data, error } = await supabase.functions.invoke('submit-contract-renewal', {
      body: {
        mode: 'negotiate',
      current_contract_id: expired.id,
      requested_months: months,
      reason: negotiationNotes.trim(),
      updated_phone: phone.trim() || null,
      requested_salary: reqSalary ? Number(reqSalary) : null,
      requested_position: reqPosition.trim() || null,
      requested_role_changes: reqRoleChanges.trim() || null,
      requested_other_terms: reqOtherTerms.trim() || null,
      negotiation_notes: negotiationNotes.trim(),
      grace_period_until: grace.toISOString(),
      },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      toast({ title: 'Submission failed', description: data?.error || error?.message || 'Could not submit change request', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Change request submitted',
      description: 'HR has been notified. You have 7-day access while they review your proposed changes.',
    });
    setNegotiating(true);
    setExpired(null);
  };

  if (!checked || (!expired && !pending && !negotiating)) return null;

  // Negotiation in review — do NOT block access (grace period)
  if (negotiating && !expired) return null;

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
            <Tabs defaultValue="accept" className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Contract expired on {new Date(expired.contract_end_date).toLocaleDateString()}</AlertTitle>
                <AlertDescription>
                  {expired.position} — {expired.department}. You may accept the standard renewal terms,
                  or request changes (salary, role, or other terms) before signing.
                </AlertDescription>
              </Alert>

              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="accept" className="gap-2">
                  <FileSignature className="h-4 w-4" /> Accept &amp; Sign
                </TabsTrigger>
                <TabsTrigger value="negotiate" className="gap-2">
                  <MessageSquare className="h-4 w-4" /> Request Changes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="accept" className="space-y-5 mt-0">
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
                <Label>Terms & Conditions *</Label>
                <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed space-y-2">
                  <p className="font-semibold text-foreground">Great Agro Coffee — Contract Renewal Terms</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                    {TERMS.map((t, i) => <li key={i}>{t}</li>)}
                  </ol>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-primary/40 p-3 bg-primary/5">
                  <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
                  <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                    I have read, understood, and accept the Terms & Conditions above.
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Digital signature * <span className="text-xs text-muted-foreground">(type your full legal name)</span></Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={employee?.name} className="font-serif italic" />
              </div>

              <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit for Admin Approval'}
              </Button>
              </TabsContent>

              <TabsContent value="negotiate" className="space-y-5 mt-0">
                <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <AlertTitle>Propose changes to your renewal terms</AlertTitle>
                  <AlertDescription className="text-xs">
                    Fill only the fields you want changed. HR will review your proposal and either issue a revised
                    contract or respond with their decision. You will retain system access for 7 days while under review.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Renewal duration: <span className="text-primary font-semibold">{months} month{months > 1 ? 's' : ''}</span></Label>
                  <Slider value={[months]} onValueChange={(v) => setMonths(v[0])} min={3} max={6} step={1} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Requested salary (UGX)</Label>
                    <Input
                      type="number"
                      value={reqSalary}
                      onChange={(e) => setReqSalary(e.target.value)}
                      placeholder="e.g. 850000"
                    />
                  </div>
                  <div>
                    <Label>Requested position</Label>
                    <Input
                      value={reqPosition}
                      onChange={(e) => setReqPosition(e.target.value)}
                      placeholder={expired.position}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role / responsibility changes</Label>
                  <Textarea
                    value={reqRoleChanges}
                    onChange={(e) => setReqRoleChanges(e.target.value)}
                    placeholder="Describe any adjustments to your assigned duties or roles..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Other terms (hours, location, benefits, etc.)</Label>
                  <Textarea
                    value={reqOtherTerms}
                    onChange={(e) => setReqOtherTerms(e.target.value)}
                    placeholder="Any other contract terms you would like reviewed..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Justification *</Label>
                  <Textarea
                    value={negotiationNotes}
                    onChange={(e) => setNegotiationNotes(e.target.value)}
                    placeholder="Explain why you are requesting these changes (min 10 characters)..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs">
                    Submitting a change request does NOT sign a contract. If HR declines your proposed changes,
                    you will be asked to either accept the original terms or escalate to a meeting.
                  </AlertDescription>
                </Alert>

                <Button onClick={submitNegotiation} disabled={submitting} className="w-full" size="lg" variant="secondary">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Change Request to HR'}
                </Button>
              </TabsContent>
            </Tabs>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContractRenewalGate;