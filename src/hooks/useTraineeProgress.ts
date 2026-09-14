import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TOUR_STEPS } from '@/components/trainee/curriculum';

export interface TraineeProgress {
  currentStep: number;
  completedSteps: number[];
  completedAt: string | null;
}

const storageKey = (id: string) => `trainee_progress_${id}`;

/** Per-intern tour progress: cached locally, persisted to trainee_progress. */
export function useTraineeProgress() {
  const { employee } = useAuth();
  const employeeId = employee?.id;
  const [progress, setProgress] = useState<TraineeProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;

    const cached = localStorage.getItem(storageKey(employeeId));
    if (cached) {
      try {
        setProgress(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }

    (async () => {
      const { data } = await (supabase as any)
        .from('trainee_progress')
        .select('current_step, completed_steps, completed_at')
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const p: TraineeProgress = {
          currentStep: data.current_step ?? 0,
          completedSteps: data.completed_steps ?? [],
          completedAt: data.completed_at ?? null,
        };
        setProgress(p);
        localStorage.setItem(storageKey(employeeId), JSON.stringify(p));
      } else if (!cached) {
        setProgress({ currentStep: 0, completedSteps: [], completedAt: null });
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const persist = useCallback(
    (p: TraineeProgress) => {
      if (!employeeId) return;
      localStorage.setItem(storageKey(employeeId), JSON.stringify(p));
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        await (supabase as any).from('trainee_progress').upsert(
          {
            employee_id: employeeId,
            employee_email: employee?.email ?? null,
            current_step: p.currentStep,
            completed_steps: p.completedSteps,
            total_steps: TOUR_STEPS.length,
            completed_at: p.completedAt,
          },
          { onConflict: 'employee_id' }
        );
      }, 600);
    },
    [employeeId, employee?.email]
  );

  const update = useCallback(
    (patch: Partial<TraineeProgress>) => {
      setProgress((prev) => {
        const base = prev ?? { currentStep: 0, completedSteps: [], completedAt: null };
        const next = { ...base, ...patch };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { progress, loaded, update };
}

export default useTraineeProgress;
