import { useAuth } from '@/contexts/AuthContext';

/**
 * "GRN Input Officer" — scan-only finance role (e.g. Timothy, Kibaba).
 * They can view finance and scan/submit GRNs for payment, but cannot release
 * money, approve, or see company-wide finance data (cash balance, totals,
 * payment history, advances, reports, duplicates, other people's referrals).
 */
export const GRN_INPUT_PERMISSIONS = ['Finance:view', 'Finance:create'];
export const GRN_INPUT_BLOCKED_PERMISSIONS = ['Finance:process', 'Finance:approve', 'Finance:edit', 'Finance:delete'];

export const useIsGrnInputOnly = () => {
  const { hasPermission, isAdmin } = useAuth();
  const admin = typeof isAdmin === 'function' ? isAdmin() : false;
  if (admin) return false;
  const canScan = hasPermission('Finance:view') || hasPermission('Finance:create');
  const canRelease =
    hasPermission('Finance:process') || hasPermission('Finance:approve') || hasPermission('Finance:edit');
  return canScan && !canRelease;
};
