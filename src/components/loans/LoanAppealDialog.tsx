import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evaluation: any;
  employee: any;
  loanType: string;
  requestedAmount: number;
  requestedTerm: number;
  guarantors?: any[];
  guarantorsRequired?: number;
  onSubmitted?: () => void;
}

export default function LoanAppealDialog({ open, onOpenChange, evaluation, employee, loanType, requestedAmount, requestedTerm, guarantors = [], guarantorsRequired = 0, onSubmitted }: Props) {
  const { toast } = useToast();
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const offered = Number(evaluation?.max_limit ?? evaluation?.recommended_amount ?? 0);
  const factors: string[] = evaluation?.factors || [];

  const submit = async () => {
    if (justification.trim().length < 30) {
      toast({ title: 'Add more detail', description: 'Please write at least 30 characters explaining why.', variant: 'destructive' });
      return;
    }
    const gs = (guarantors || []).filter(Boolean);
    if (gs.length < guarantorsRequired) {
      toast({ title: 'Select guarantor first', description: `This loan needs ${guarantorsRequired} guarantor(s). Pick them in the application form, then appeal.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { error } = await (supabase as any).from('loan_appeals').insert({
        loan_evaluation_id: evaluation?.id || null,
        user_id: uid,
        employee_email: employee?.email,
        employee_name: employee?.name,
        requested_amount: requestedAmount,
        offered_amount: offered,
        loan_type: loanType,
        requested_term_months: requestedTerm,
        justification: justification.trim(),
        evaluation_snapshot: evaluation || {},
        guarantor_id: gs[0]?.id || null, guarantor_email: gs[0]?.email || null,
        guarantor_name: gs[0]?.name || null, guarantor_phone: gs[0]?.phone || null,
        guarantor2_id: gs[1]?.id || null, guarantor2_email: gs[1]?.email || null,
        guarantor2_name: gs[1]?.name || null, guarantor2_phone: gs[1]?.phone || null,
      });
      if (error) throw error;
      // Confirmation emails: borrower + each guarantor
      const notify = (to: string, name: string, title: string, message: string, key: string) =>
        supabase.functions.invoke('send-transactional-email', { body: { templateName: 'general-notification', recipientEmail: to, idempotencyKey: key, templateData: { title, recipientName: name, message } } }).catch(() => {});
      const stamp = Date.now();
      if (employee?.email) notify(employee.email, employee.name, 'Loan Appeal Submitted', `Your appeal for UGX ${requestedAmount.toLocaleString()} (${requestedTerm} months) has been received. Three admins will review it.${gs.length ? ` If approved, your guarantor${gs.length > 1 ? 's' : ''} (${gs.map((g: any) => g.name).join(', ')}) will receive an approval code to sign before any money is sent.` : ''}`, `appeal-submitted-${uid}-${stamp}`);
      gs.forEach((g: any, i: number) => g?.email && notify(g.email, g.name, 'You are listed as a loan guarantor', `${employee?.name} has appealed a loan decision for UGX ${requestedAmount.toLocaleString()} over ${requestedTerm} months and listed you as guarantor. If admins approve the appeal, you will receive an approval code by SMS and email to approve or reject it.`, `appeal-guarantor-listed-${uid}-${i}-${stamp}`));
      toast({ title: 'Appeal submitted', description: 'Admins will review. You will be notified once 3 admins decide.' });
      onOpenChange(false);
      setJustification('');
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Appeal Loan Evaluation</DialogTitle>
          <DialogDescription>
            Disagree with the decision? Submit an appeal. Three admins must independently agree before any change takes effect.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Card className="bg-muted/40">
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between"><span>You requested:</span><strong>UGX {requestedAmount.toLocaleString()}</strong></div>
              <div className="flex justify-between"><span>System offered:</span><strong>UGX {offered.toLocaleString()}</strong></div>
              <div className="flex justify-between"><span>Term requested:</span><strong>{requestedTerm} months</strong></div>
              {(guarantors || []).filter(Boolean).length > 0 && (
                <div className="flex justify-between"><span>Guarantor(s):</span><strong>{(guarantors || []).filter(Boolean).map((g: any) => g.name).join(', ')}</strong></div>
              )}
              <div className="flex justify-between"><span>Decision:</span><strong className="uppercase">{evaluation?.decision}</strong></div>
              {factors.length > 0 && (
                <div className="pt-1 text-xs text-muted-foreground">
                  <div className="font-medium">Reasons:</div>
                  <ul className="list-disc pl-4">{factors.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
          <div>
            <Label>Why should admins reconsider? <span className="text-destructive">*</span></Label>
            <Textarea
              rows={5}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why the decision should be reconsidered (min 30 characters). Include any context — extra income, upcoming bonus, urgent need, etc."
            />
            <div className="text-[11px] text-muted-foreground mt-1">{justification.length}/30 minimum</div>
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Appeal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}