import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ApprovalCenter from '@/components/ApprovalCenter';
import ApprovedRequestsHistory from '@/components/admin/ApprovedRequestsHistory';
import AdminQualityPricingReview from '@/components/admin/AdminQualityPricingReview';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';
import { Shield, ClipboardCheck, DollarSign } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useUnifiedApprovalRequests } from '@/hooks/useUnifiedApprovalRequests';

const Approvals = () => {
  const { employee, isAdmin } = useAuth();
  const roleData = useRoleBasedData();
  const { requests } = useUnifiedApprovalRequests();

  // Redirect if user is not an admin
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const totalPendingAmount = requests.reduce((sum, req) => {
    const amount = typeof req.amount === 'string' ? parseFloat(req.amount) || 0 : req.amount || 0;
    return sum + amount;
  }, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-UG').format(value);

  return (
    <DashboardLayout title="Approvals" subtitle="Review and manage pending requests">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="card-modern p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Approval Management
                </h2>
                <p className="text-muted-foreground text-sm">
                  Review expense requests, money requests, and other pending approvals
                </p>
              </div>
            </div>

            {/* Total Pending Amount */}
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Total Pending Amount</p>
                <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                  UGX {formatCurrency(totalPendingAmount)}
                </p>
                <p className="text-xs text-amber-500">{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Assessments Pending Pricing */}
        <AdminQualityPricingReview />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Center - Takes 2 columns */}
          <div className="lg:col-span-2 card-modern p-5">
            <ApprovalCenter />
          </div>

          {/* Approval History - Takes 1 column */}
          <div className="lg:col-span-1">
            <ApprovedRequestsHistory />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Approvals;
