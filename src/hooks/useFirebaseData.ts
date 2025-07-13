
import { useFirebaseEmployees } from './useFirebaseEmployees';
import { useFirebaseFinance } from './useFirebaseFinance';

// Migration wrapper that provides the same interface as Supabase hooks
export const useEmployees = useFirebaseEmployees;
export const useFinanceData = useFirebaseFinance;

// Re-export other hooks that will be migrated
export { useAuth } from '@/contexts/AuthContext';
