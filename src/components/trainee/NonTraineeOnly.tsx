import type { ReactNode } from 'react';
import { useTraineeMode } from '@/hooks/useTraineeMode';

/** Hides money pop-ups, reminders and wallet UI from Trainee accounts. */
export function NonTraineeOnly({ children }: { children: ReactNode }) {
  const trainee = useTraineeMode();
  if (trainee) return null;
  return <>{children}</>;
}

export default NonTraineeOnly;
