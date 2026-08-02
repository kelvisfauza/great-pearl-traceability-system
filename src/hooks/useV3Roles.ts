import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type V3Role =
  | 'managing_director' | 'operations_manager' | 'branch_manager'
  | 'quality_manager' | 'quality_officer'
  | 'store_manager' | 'storekeeper'
  | 'production_manager' | 'production_operator'
  | 'trade_manager' | 'logistics_manager' | 'driver'
  | 'export_manager' | 'export_officer'
  | 'compliance_officer' | 'finance_manager' | 'finance_officer'
  | 'procurement_it' | 'hr_admin' | 'v3_admin';

export const V3_ROLE_LABELS: Record<V3Role, string> = {
  managing_director: 'Managing Director',
  operations_manager: 'Operations Manager',
  branch_manager: 'Branch Manager',
  quality_manager: 'Quality Manager',
  quality_officer: 'Quality Officer',
  store_manager: 'Store Manager',
  storekeeper: 'Storekeeper',
  production_manager: 'Production Manager',
  production_operator: 'Production Operator',
  trade_manager: 'Trade Manager',
  logistics_manager: 'Logistics Manager',
  driver: 'Driver',
  export_manager: 'Export Manager',
  export_officer: 'Export Officer',
  compliance_officer: 'Compliance Officer',
  finance_manager: 'Finance Manager',
  finance_officer: 'Finance Officer',
  procurement_it: 'Procurement / IT',
  hr_admin: 'HR / Administration',
  v3_admin: 'V3 Administrator',
};

const ADMIN_ROLES: V3Role[] = ['v3_admin', 'managing_director', 'operations_manager'];

export function useV3Roles() {
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['v3-roles', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v3_user_roles')
        .select('role, branch_id, expires_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).filter(
        (r) => !r.expires_at || new Date(r.expires_at) > new Date(),
      );
    },
  });

  const roles = (data || []).map((r) => r.role as V3Role);
  const legacyAdmin = typeof isAdmin === 'function' ? isAdmin() : false;
  const isV3Admin = legacyAdmin || roles.some((r) => ADMIN_ROLES.includes(r));

  const hasRole = (...check: V3Role[]) => isV3Admin || check.some((r) => roles.includes(r));

  return {
    roles,
    branchIds: (data || []).map((r) => r.branch_id).filter(Boolean) as string[],
    isV3Admin,
    hasRole,
    loading: isLoading,
  };
}