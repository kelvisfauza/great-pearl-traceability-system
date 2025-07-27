
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import ApprovalRequests from '@/components/ApprovalRequests';
import AdminDashboard from '@/components/admin/AdminDashboard';

const Index = () => {
  const { employee } = useAuth();

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {employee.name}</p>
          </div>
        </div>

        {/* Show admin dashboard for admin users */}
        {employee.role === 'Administrator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Admin Controls</h2>
            </div>
            <AdminDashboard />
          </div>
        )}

        {/* Regular dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardStats />
          <QuickActions />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <PerformanceOverview />
        </div>

        {/* Approval Requests Section */}
        <ApprovalRequests />
      </div>
    </Layout>
  );
};

export default Index;
