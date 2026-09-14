import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTraineeMode } from '@/hooks/useTraineeMode';
import { useTraineeProgress } from '@/hooks/useTraineeProgress';
import { TOUR_STEPS, firstStepOfDepartment } from './curriculum';

export const TOUR_OPEN_EVENT = 'trainee-tour:open';

export interface TourOpenDetail {
  step?: number;
  department?: string;
  restart?: boolean;
}

export function openTraineeTour(detail: TourOpenDetail = {}) {
  window.dispatchEvent(new CustomEvent<TourOpenDetail>(TOUR_OPEN_EVENT, { detail }));
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;
const CARD_W = 380;
const CARD_H_GUESS = 260;

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export function TraineeTour() {
  const trainee = useTraineeMode();
  const { progress, loaded, update } = useTraineeProgress();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [searching, setSearching] = useState(false);
  const targetRef = useRef<Element | null>(null);
  const autoOpened = useRef(false);

  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;

  // Auto-start on first login / resume where the intern stopped.
  useEffect(() => {
    if (!trainee || !loaded || !progress || autoOpened.current) return;
    autoOpened.current = true;
    if (progress.completedAt) return;
    if (sessionStorage.getItem('trainee_tour_skipped') === '1') return;
    setIndex(Math.min(progress.currentStep, total - 1));
    setOpen(true);
  }, [trainee, loaded, progress, total]);

  // Header button / sidebar link
  useEffect(() => {
    if (!trainee) return;
    const handler = (e: Event) => {
      const d = (e as CustomEvent<TourOpenDetail>).detail || {};
      let next = 0;
      if (typeof d.step === 'number') next = d.step;
      else if (d.department) next = firstStepOfDepartment(d.department);
      else if (!d.restart && progress) next = progress.completedAt ? 0 : progress.currentStep;
      setIndex(Math.max(0, Math.min(next, total - 1)));
      sessionStorage.removeItem('trainee_tour_skipped');
      setOpen(true);
    };
    window.addEventListener(TOUR_OPEN_EVENT, handler);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, handler);
  }, [trainee, progress, total]);

  // Navigate to the step's page, activate its tab, then locate the target.
  useEffect(() => {
    if (!open || !trainee || !step) return;
    targetRef.current = null;
    setRect(null);

    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    if (currentPath !== step.route) {
      navigate(step.route);
      return; // effect re-runs once location changes
    }

    let attempts = 0;
    let activated = false;
    setSearching(Boolean(step.target || step.activate));
    const timer = window.setInterval(() => {
      attempts += 1;
      if (step.activate && !activated) {
        const tabEl = document.querySelector(step.activate) as HTMLElement | null;
        if (tabEl) {
          activated = true;
          if (tabEl.getAttribute('data-state') !== 'active') tabEl.click();
        }
      }
      if (!step.target) {
        if (!step.activate || activated || attempts > 20) {
          window.clearInterval(timer);
          setSearching(false);
        }
        return;
      }
      const el = document.querySelector(step.target);
      if (el && (el as HTMLElement).offsetParent !== null) {
        window.clearInterval(timer);
        targetRef.current = el;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        window.setTimeout(() => setRect(rectOf(el)), 350);
        setSearching(false);
      } else if (attempts > 27) {
        window.clearInterval(timer);
        setSearching(false);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [open, trainee, step, index, location.pathname, navigate]);

  // Keep the spotlight glued to the target while scrolling / resizing.
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      const el = targetRef.current;
      if (el && el.isConnected) setRect(rectOf(el));
    };
    const id = window.setInterval(sync, 250);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open]);

  const goTo = useCallback(
    (next: number, markDone?: number) => {
      const clamped = Math.max(0, Math.min(next, total - 1));
      setIndex(clamped);
      const done = new Set(progress?.completedSteps ?? []);
      if (typeof markDone === 'number') done.add(markDone);
      update({ currentStep: clamped, completedSteps: Array.from(done).sort((a, b) => a - b) });
    },
    [progress?.completedSteps, total, update]
  );

  const finish = useCallback(() => {
    const done = new Set(progress?.completedSteps ?? []);
    done.add(index);
    update({
      currentStep: total - 1,
      completedSteps: Array.from(done).sort((a, b) => a - b),
      completedAt: new Date().toISOString(),
    });
    setOpen(false);
  }, [index, progress?.completedSteps, total, update]);

  const skip = useCallback(() => {
    sessionStorage.setItem('trainee_tour_skipped', '1');
    setOpen(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        index < total - 1 ? goTo(index + 1, index) : finish();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, total, goTo, finish, skip]);

  // Card placement
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - 24);
    const h = cardRef.current?.offsetHeight || CARD_H_GUESS;
    if (!rect) {
      setCardStyle({ top: Math.max(12, (vh - h) / 2), left: Math.max(12, (vw - w) / 2), width: w });
      return;
    }
    const placement = step?.placement || 'auto';
    let top: number;
    let left: number;
    const fitsBelow = rect.top + rect.height + 12 + h < vh;
    const fitsAbove = rect.top - 12 - h > 0;
    const fitsRight = rect.left + rect.width + 12 + w < vw;
    if (placement === 'right' || (placement === 'auto' && !fitsBelow && !fitsAbove && fitsRight)) {
      top = Math.max(12, Math.min(rect.top, vh - h - 12));
      left = rect.left + rect.width + 12;
    } else if (placement === 'top' || (placement === 'auto' && !fitsBelow && fitsAbove)) {
      top = rect.top - 12 - h;
      left = rect.left;
    } else {
      top = Math.min(rect.top + rect.height + 12, vh - h - 12);
      left = rect.left;
    }
    left = Math.max(12, Math.min(left, vw - w - 12));
    top = Math.max(12, top);
    setCardStyle({ top, left, width: w });
  }, [rect, step, index]);

  const percent = useMemo(() => Math.round(((index + 1) / total) * 100), [index, total]);

  if (!trainee || !open || !step) return null;

  const isLast = index === total - 1;

  return (
    <div data-trainee-ui="true" className="fixed inset-0 z-[9998]" aria-live="polite">
      {/* Dimmed backdrop with a spotlight cut-out */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="trainee-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx="10" fill="black" />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(var(--foreground) / 0.55)"
          mask="url(#trainee-spotlight)"
        />
        {rect && (
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Step card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainee-tour-title"
        style={cardStyle}
        className="absolute rounded-xl border border-border bg-card text-card-foreground shadow-2xl p-4 sm:p-5 space-y-3 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>
              Step {index + 1} of {total} · {step.department}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={skip} aria-label="Pause tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Progress value={percent} className="h-1.5" />

        <div className="space-y-1.5">
          <h2 id="trainee-tour-title" className="text-base font-semibold leading-snug">
            {isLast && <CheckCircle2 className="inline h-4 w-4 mr-1.5 text-primary -mt-0.5" />}
            {step.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
          {searching && step.target && (
            <p className="text-xs text-muted-foreground/70 italic">Locating this on the page…</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
            Pause
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {isLast ? (
              <Button size="sm" onClick={finish}>
                Finish
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => goTo(index + 1, index)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TraineeTour;
