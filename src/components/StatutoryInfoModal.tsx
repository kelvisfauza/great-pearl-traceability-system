import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const DEADLINE = new Date('2026-06-15T23:59:59');
const SKIP_KEY = 'statutory_info_skip_until';

const StatutoryInfoModal = () => {
  const { employee, fetchEmployeeData } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tin, setTin] = useState('');
  const [nssf, setNssf] = useState('');
  const [saving, setSaving] = useState(false);

  const pastDeadline = new Date() > DEADLINE;

  useEffect(() => {
    if (!employee) return;
    // Skip when we only have a synthetic fallback employee (no DB record loaded).
    // The fallback omits tin_number/nssf_number and would falsely re-prompt users
    // who already submitted, e.g. after a transient token refresh / RLS error.
    if (!(employee as any).employee_id) {
      setOpen(false);
      return;
    }
    const hasTin = !!(employee as any).tin_number?.toString().trim();
    const hasNssf = !!(employee as any).nssf_number?.toString().trim();
    if (hasTin && hasNssf) {
      setOpen(false);
      return;
    }
    if (!pastDeadline) {
      const skipUntil = sessionStorage.getItem(SKIP_KEY);
      if (skipUntil && Date.now() < Number(skipUntil)) {
        setOpen(false);
        return;
      }
    }
    setTin((employee as any).tin_number || '');
    setNssf((employee as any).nssf_number || '');
    setOpen(true);
  }, [employee, pastDeadline]);

  const handleSave = async () => {
    if (!employee) return;
    if (!tin.trim() || !nssf.trim()) {
      toast({ title: 'Both fields required', description: 'Please enter both your TIN and NSSF numbers.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('employees')
      .update({ tin_number: tin.trim(), nssf_number: nssf.trim() } as any)
      .eq('id', employee.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Your statutory information has been recorded.' });
    await fetchEmployeeData((employee as any).user_id || undefined);
    setOpen(false);
  };

  const handleSkip = () => {
    // Skip for this session only — will prompt again on next login
    sessionStorage.setItem(SKIP_KEY, String(Date.now() + 1000 * 60 * 60 * 8));
    setOpen(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !pastDeadline) handleSkip(); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => { if (pastDeadline) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (pastDeadline) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Statutory Information Required
          </DialogTitle>
          <DialogDescription>
            Please provide your URA TIN and NSSF account numbers. These are required for statutory payroll deductions (PAYE & NSSF).
          </DialogDescription>
        </DialogHeader>

        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${pastDeadline ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {pastDeadline ? (
              <span>The submission deadline (15/06/2026) has passed. You must submit this information before continuing to use the system.</span>
            ) : (
              <span>Submission deadline: <strong>15/06/2026</strong>. After this date, access will be blocked until the information is submitted.</span>
            )}
          </div>
        </div>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="tin">URA TIN Number</Label>
            <Input id="tin" value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. 1000123456" maxLength={20} />
          </div>
          <div>
            <Label htmlFor="nssf">NSSF Account Number</Label>
            <Input id="nssf" value={nssf} onChange={(e) => setNssf(e.target.value)} placeholder="e.g. M123456789" maxLength={30} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {!pastDeadline && (
            <Button variant="outline" onClick={handleSkip} disabled={saving}>
              Skip for now
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatutoryInfoModal;