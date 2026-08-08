import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, Check, HelpCircle, LayoutGrid, FlaskConical,
  Paperclip, QrCode, ShieldCheck, Receipt, FileSignature,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Bump this key whenever new steps are added so users see the tour again. */
const TOUR_KEY = 'feature_tour_seen_v1_quality_2026_08';

interface TourStep {
  title: string;
  where: string;
  body: string;
  icon: typeof LayoutGrid;
  route?: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Quality starts on the Overview',
    where: 'Quality Control → Overview',
    body: 'The Quality page now opens on a card dashboard with live counts, star ratings and charts. Click any coloured card to open that module, then use “Back to Overview” to return.',
    icon: LayoutGrid,
    route: '/quality-control',
  },
  {
    title: 'Fill the analysis form in the system',
    where: 'Quality → Analysis Form',
    body: 'Enter the physical assessment parameters, then print the filled form for stamping by the quality personnel and the manager. Every print carries a QR code for verification.',
    icon: FileSignature,
    route: '/quality-control',
  },
  {
    title: 'Scan the stamped form with your phone',
    where: 'Quality → Analysis Files',
    body: 'Open Analysis Files, scan the on-screen QR with your phone camera, and the phone becomes the scanner. The scanned form loads on your desktop so you can attach the stamped copy.',
    icon: QrCode,
    route: '/quality-control',
  },
  {
    title: 'Attach a saved analysis when pricing',
    where: 'Quality → Assessments',
    body: 'While assessing coffee for pricing, pick an already-saved analysis file for that supplier (or an offer sample) instead of re-uploading it.',
    icon: Paperclip,
    route: '/quality-control',
  },
  {
    title: 'Manager review before approval',
    where: 'Quality → Approvals',
    body: 'The manager sees the full assessment, the reports and the attached stamped file before approving or adjusting the price.',
    icon: ShieldCheck,
    route: '/quality-control',
  },
  {
    title: 'GRN prints right after approval',
    where: 'Quality → Approvals',
    body: 'Once approved or adjusted, the GRN print window opens automatically. You can also re-print from any approved record in the history list.',
    icon: Receipt,
    route: '/quality-control',
  },
  {
    title: 'Discretionary purchase of rejected lots',
    where: 'Quality → Rejected Lots',
    body: 'Quality Managers — like Admins — can now buy rejected coffee into the system. Those purchases flow into approvals and on to Finance for payment.',
    icon: FlaskConical,
    route: '/quality-control',
  },
];

export const openFeatureTour = () => window.dispatchEvent(new CustomEvent('open-feature-tour'));

export default function FeatureTour() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handler = () => { setI(0); setOpen(true); };
    window.addEventListener('open-feature-tour', handler);
    return () => window.removeEventListener('open-feature-tour', handler);
  }, []);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, new Date().toISOString());
    setOpen(false);
  };

  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : finish())}>
        <DialogContent className="sm:max-w-lg">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1 text-[10px]">What's new</Badge>
                <h2 className="text-lg font-semibold leading-tight">{step.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{step.where}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{step.body}</p>

            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30',
                  )}
                />
              ))}
              <span className="ml-auto text-xs text-muted-foreground">{i + 1} / {STEPS.length}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
              <div className="flex items-center gap-2">
                {step.route && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { finish(); navigate(step.route!); }}
                  >
                    Take me there
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled={i === 0} onClick={() => setI((v) => v - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                {last ? (
                  <Button size="sm" onClick={finish}>
                    <Check className="h-4 w-4 mr-1" /> Got it
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setI((v) => v + 1)}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!open && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setI(0); setOpen(true); }}
          className="fixed bottom-4 right-4 z-40 shadow-lg rounded-full"
          aria-label="Show what's new tour"
        >
          <HelpCircle className="h-4 w-4 mr-1" /> What's new
        </Button>
      )}
    </>
  );
}