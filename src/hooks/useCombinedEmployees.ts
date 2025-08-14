import { useSupabaseEmployees } from './useSupabaseEmployees';

export const useCombinedEmployees = () => {
  const { employees, loading, error, refetch } = useSupabaseEmployees();

  return {
    employees,
    loading,
    error,
    refetch
  };
};