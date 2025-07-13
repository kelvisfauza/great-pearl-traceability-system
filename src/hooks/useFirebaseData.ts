
import { useFirebaseEmployees } from './useFirebaseEmployees';
import { useFirebaseFinance } from './useFirebaseFinance';
import { useAuth } from '@/contexts/AuthContext';

// Main data hooks using Firebase only
export const useEmployees = useFirebaseEmployees;
export const useFinanceData = useFirebaseFinance;
export { useAuth };
