import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PiggyBank, Calendar, TrendingDown, ShieldAlert, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'seasonal_advisory_ack_v1:';
const STATUTORY_SKIP_KEY = 'statutory_info_skip_until';

type Step = 'off-season' | 'ebola' | null;

const SeasonalAdvisoryModal = () => {
  const { employee } = useAuth();
  const [step, setStep] = useState<Step>(null);
  const [acknowledgedEbola, setAcknowledgedEbola] = useState(false);

  useEffect(() => {
    if (!employee) return;
    const ackKey = STORAGE_KEY_PREFIX + ((employee as any).id || (employee as any).email || 'anon');
    if (localStorage.getItem(ackKey)) return;

    // Wait until the statutory modal is no longer blocking the screen
    const hasTin = !!(employee as any).tin_number?.toString().trim();
    const hasNssf = !!(employee as any).nssf_number?.toString().trim();
    const statutorySatisfied = (hasTin && hasNssf) || !!sessionStorage.getItem(STATUTORY_SKIP_KEY);
    if (!statutorySatisfied) {
      // Re-check shortly
      const t = setInterval(() => {
        const sk = sessionStorage.getItem(STATUTORY_SKIP_KEY);
        const e: any = employee;
        if ((e?.tin_number && e?.nssf_number) || sk) {
          clearInterval(t);
          setStep('off-season');
        }
      }, 1500);
      return () => clearInterval(t);
    }

    setStep('off-season');
  }, [employee]);

  const handleOffSeasonNext = () => setStep('ebola');
  const handleClose = () => {
    const ackKey = STORAGE_KEY_PREFIX + ((employee as any)?.id || (employee as any)?.email || 'anon');
    try { localStorage.setItem(ackKey, new Date().toISOString()); } catch {}
    setStep(null);
    setAcknowledgedEbola(false);
  };

  if (!employee || !step) return null;

  return (
    <>
      {/* ========== OFF-SEASON SAVINGS ADVISORY ========== */}
      <Dialog open={step === 'off-season'} onOpenChange={() => { /* require button to advance */ }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
          {/* Hero band */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-6 pt-6 pb-8 text-white">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} />
            <div className="relative flex items-start gap-4">
              <div className="rounded-full bg-white/15 backdrop-blur-sm p-3 ring-1 ring-white/30">
                <PiggyBank className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-white/25">
                  <Calendar className="h-3 w-3" /> Off-Season Advisory
                </div>
                <h2 className="mt-2 text-xl font-bold leading-tight">Plan ahead — the coffee off-season is coming</h2>
                <p className="mt-1 text-sm text-emerald-50/90">A short message from Management</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              Dear <strong>{(employee as any).name?.split(' ')[0] || 'Team'}</strong>, we are entering the <strong>coffee off-season</strong>, a period of approximately <strong>2 months</strong> where buying volumes, sales activity, and cash flow naturally slow down across the company.
            </p>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
                <TrendingDown className="h-4 w-4" />
                What this means for you
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-emerald-900/90 dark:text-emerald-100/90 list-disc pl-5">
                <li>Allowances, overtime and bonus opportunities may be reduced</li>
                <li>Loan approvals and instant withdrawals may be tighter</li>
                <li>Salaries continue, but discretionary spend should be planned carefully</li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-sm">
                <PiggyBank className="h-4 w-4" />
                You are strongly encouraged to save
              </div>
              <p className="mt-1.5 text-sm text-amber-900/90 dark:text-amber-100/90">
                Set aside a portion of your earnings <strong>now</strong> to cover the next <strong>2 months</strong>. Consider the <strong>Invest &amp; Earn</strong> program (25% return over 3 months) or simply hold funds in your wallet. Your future self will thank you.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 pt-0">
            <Button onClick={handleOffSeasonNext} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              I understand — continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== EBOLA OUTBREAK WARNING ========== */}
      <Dialog open={step === 'ebola'} onOpenChange={() => { /* require checkbox + button */ }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
          <div className="relative bg-gradient-to-br from-red-700 via-red-800 to-rose-900 px-6 pt-6 pb-8 text-white">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, white 0 2px, transparent 2px 14px)'
            }} />
            <div className="relative flex items-start gap-4">
              <div className="rounded-full bg-white/15 backdrop-blur-sm p-3 ring-1 ring-white/30 animate-pulse">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-white/30">
                  <AlertTriangle className="h-3 w-3" /> Urgent Health Notice
                </div>
                <h2 className="mt-2 text-xl font-bold leading-tight">Ebola Outbreak — Take This Seriously</h2>
                <p className="mt-1 text-sm text-red-50/90">Mandatory awareness from Management &amp; Operations</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              An <strong className="text-red-700 dark:text-red-400">Ebola Virus Disease (EVD) outbreak</strong> has been reported. This is a <strong>highly contagious and life-threatening</strong> disease. Every staff member must take immediate precautions to protect themselves, their families, and our work community.
            </p>

            <div className="rounded-lg border-2 border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold text-sm">
                <Activity className="h-4 w-4" /> Watch for these symptoms
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-red-900/90 dark:text-red-100/90 list-disc pl-5">
                <li>Sudden high fever</li>
                <li>Severe headache</li>
                <li>Muscle &amp; joint pain</li>
                <li>Vomiting / diarrhoea</li>
                <li>Unexplained bleeding</li>
                <li>Extreme weakness</li>
              </ul>
            </div>

            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-card p-4">
              <div className="text-sm font-bold text-foreground mb-2">Mandatory precautions</div>
              <ul className="space-y-1.5 text-sm text-foreground/90 list-disc pl-5">
                <li><strong>Wash hands</strong> frequently with soap and clean water</li>
                <li><strong>Avoid physical contact</strong> — no handshakes, hugs, or sharing utensils</li>
                <li><strong>Do NOT touch</strong> sick persons, dead bodies, or bushmeat</li>
                <li>Report any symptoms <strong>immediately</strong> to your supervisor and the nearest health facility</li>
                <li>Stay informed via <strong>Ministry of Health</strong> updates only — avoid rumours</li>
              </ul>
            </div>

            <div className="rounded-md bg-red-600 text-white text-xs font-medium px-3 py-2 text-center">
              In case of suspected exposure, call the MoH toll-free hotline <strong>0800-100-066</strong>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer rounded-md border border-border bg-muted/30 p-3 hover:bg-muted/50 transition">
              <input
                type="checkbox"
                checked={acknowledgedEbola}
                onChange={(e) => setAcknowledgedEbola(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600 cursor-pointer"
              />
              <span className="text-sm text-foreground leading-snug">
                I have read and understood this notice. I will follow all safety guidelines and report any symptoms immediately.
              </span>
            </label>
          </div>

          <DialogFooter className="px-6 pb-5 pt-0">
            <Button
              onClick={handleClose}
              disabled={!acknowledgedEbola}
              className="w-full sm:w-auto bg-red-700 hover:bg-red-800 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Acknowledge &amp; continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SeasonalAdvisoryModal;