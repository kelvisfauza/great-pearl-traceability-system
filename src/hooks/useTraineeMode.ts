import { useAuth } from '@/contexts/AuthContext';
import { isTraineeRole } from '@/lib/trainee';

/** True when the signed-in employee is a Trainee (intern) account. */
export function useTraineeMode(): boolean {
  const { employee } = useAuth();
  return isTraineeRole(employee?.role);
}

export default useTraineeMode;
