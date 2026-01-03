import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ApprovalCenter from '@/components/ApprovalCenter';
import ApprovedRequestsHistory from '@/components/admin/ApprovedRequestsHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';
import { Shield, ClipboardCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Approvals = () => {
  const { employee, isAdmin } = useAuth();
  const roleData = useRoleBasedData();

  // Redirect if user is not an admin
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Approvals" subtitle="Review and manage pending requests">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="card-modern p-6">
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
        </div>

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
