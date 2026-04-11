import { CheckCircle, Clock, Shield, DollarSign, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalStep {
  label: string;
  icon: React.ReactNode;
  approved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

interface ApprovalProgressTrackerProps {
  requiresThreeApprovals: boolean;
  financeApprovedAt?: string | null;
  financeApprovedBy?: string | null;
  financeReviewAt?: string | null;
  financeReviewBy?: string | null;
  adminApprovedAt?: string | null;
  adminApprovedBy?: string | null;
  adminFinalApprovalAt?: string | null;
  adminFinalApprovalBy?: string | null;
  adminApproved1At?: string | null;
  adminApproved1By?: string | null;
  adminApproved2At?: string | null;
  adminApproved2By?: string | null;
  status: string;
}

const ApprovalProgressTracker = ({
  requiresThreeApprovals,
  financeApprovedAt,
  financeApprovedBy,
  financeReviewAt,
  financeReviewBy,
  adminApprovedAt,
  adminApprovedBy,
  adminFinalApprovalAt,
  adminFinalApprovalBy,
  adminApproved1At,
  adminApproved1By,
  adminApproved2At,
  adminApproved2By,
  status,
}: ApprovalProgressTrackerProps) => {
  if (status === 'Rejected' || status === 'Withdrawn') return null;

  // Use new columns with fallback to legacy columns
  const effectiveFinanceAt = financeReviewAt || financeApprovedAt;
  const effectiveFinanceBy = financeReviewBy || financeApprovedBy;
  const effectiveAdminAt = adminFinalApprovalAt || adminApprovedAt;
  const effectiveAdminBy = adminFinalApprovalBy || adminApprovedBy;

  const steps: ApprovalStep[] = requiresThreeApprovals
    ? [
        {
          label: 'Admin 1',
          icon: <Shield className="h-3.5 w-3.5" />,
          approved: !!adminApproved1At,
          approvedBy: adminApproved1By,
          approvedAt: adminApproved1At,
        },
        {
          label: 'Admin 2',
          icon: <Users className="h-3.5 w-3.5" />,
          approved: !!adminApproved2At,
          approvedBy: adminApproved2By,
          approvedAt: adminApproved2At,
        },
        {
          label: 'Finance',
          icon: <DollarSign className="h-3.5 w-3.5" />,
          approved: !!effectiveFinanceAt,
          approvedBy: effectiveFinanceBy,
          approvedAt: effectiveFinanceAt,
        },
      ]
    : [
        {
          label: 'Admin',
          icon: <Shield className="h-3.5 w-3.5" />,
          approved: !!effectiveAdminAt,
          approvedBy: effectiveAdminBy,
          approvedAt: effectiveAdminAt,
        },
        {
          label: 'Finance',
          icon: <DollarSign className="h-3.5 w-3.5" />,
          approved: !!effectiveFinanceAt,
          approvedBy: effectiveFinanceBy,
          approvedAt: effectiveFinanceAt,
        },
      ];

  const approvedCount = steps.filter((s) => s.approved).length;
  const totalSteps = steps.length;
  const allApproved = approvedCount === totalSteps;

  return (
    <div className="mt-3 space-y-2">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Approval Progress
        </span>
        <span
          className={cn(
            'text-xs font-bold',
            allApproved ? 'text-green-600' : 'text-blue-600'
          )}
        >
          {approvedCount}/{totalSteps} approved
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            allApproved
              ? 'bg-green-500'
              : approvedCount > 0
              ? 'bg-blue-500'
              : 'bg-muted-foreground/20'
          )}
          style={{ width: `${(approvedCount / totalSteps) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center flex-1">
            <div
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs w-full justify-center border',
                step.approved
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-muted text-muted-foreground border-border'
              )}
              title={
                step.approved
                  ? `Approved by ${step.approvedBy || 'Unknown'} on ${step.approvedAt ? new Date(step.approvedAt).toLocaleDateString() : ''}`
                  : 'Pending'
              }
            >
              {step.approved ? (
                <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
              ) : (
                <Clock className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'w-3 h-0.5 shrink-0',
                  step.approved ? 'bg-green-400' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalProgressTracker;
