import { useAuth } from '@/contexts/AuthContext';

/**
 * Quality department role split.
 * - Quality Manager (head of quality) / Super Admin / Administrator / Manager:
 *   full access — approvals, reports, analytics, history, performance, GRN printing.
 * - Quality personnel: assess coffee & suggest a price, submitted to the head of
 *   quality for approval. No reports/analytics/approvals access.
 */
export const useQualityRole = () => {
  const { employee } = useAuth();
  const role = (employee?.role || '').toLowerCase();
  const position = ((employee as any)?.position || '').toLowerCase();

  const isSuperAdmin = role === 'super admin';
  const isAdministrator = role === 'administrator' || role === 'admin';
  const isGeneralManager = role === 'manager';

  const isQualityManager =
    role === 'quality manager' ||
    position.includes('quality manager') ||
    position.includes('head of quality');

  const isQualityHead = isQualityManager || isSuperAdmin || isAdministrator || isGeneralManager;

  return {
    isQualityManager,
    isQualityHead,
    // Only the head of quality (or admins) may do these
    canApproveQualityPricing: isQualityHead,
    canViewQualityReports: isQualityHead,
    canViewQualityAnalytics: isQualityHead,
    canPrintGRN: isQualityHead,
    canViewQualityHistory: isQualityHead,
    canViewTeamPerformance: isQualityHead,
    reviewerName: (employee as any)?.name || employee?.email || '',
    reviewerEmail: employee?.email || '',
  };
};
