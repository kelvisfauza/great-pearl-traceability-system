
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import ApprovalRequests from '@/components/ApprovalRequests';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';

const Index = () => {
  const { employee } = useAuth();
  const roleData = useRoleBasedData();

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 border border-border/50 backdrop-blur-sm">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-lg text-muted-foreground">Welcome back, {employee.name}</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-sm font-medium text-primary">{employee.role} • {employee.department}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>

        {/* Admin Dashboard Section */}
        {employee.role === 'Administrator' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-2xl font-semibold text-foreground">Admin Controls</h2>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
              <AdminDashboard />
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="space-y-8">
          {/* Stats Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-2xl font-semibold text-foreground">Key Metrics</h2>
            </div>
            <DashboardStats />
          </div>

          {/* Quick Actions & Activities */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-3 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-gradient-to-b from-accent to-accent/50 rounded-full"></div>
                <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
              </div>
              <QuickActions />
            </div>
            
            <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-gradient-to-b from-secondary to-secondary/50 rounded-full"></div>
                <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
              </div>
              <RecentActivity />
            </div>
          </div>

          {/* Performance & Approvals */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-gradient-to-b from-primary/70 to-primary/30 rounded-full"></div>
                <h3 className="text-xl font-semibold text-foreground">Performance Overview</h3>
              </div>
              <PerformanceOverview />
            </div>
            
            {/* Approval Requests Section - Admin Only */}
            {roleData?.isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-gradient-to-b from-destructive/70 to-destructive/30 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-foreground">Approval Requests</h3>
                </div>
                <ApprovalRequests />
              </div>
            )}

            {/* EUDR Compliance Section */}
            {(employee.department === 'Store' || employee.role === 'Administrator') && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-gradient-to-b from-green-500/70 to-green-500/30 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-foreground">EUDR Compliance</h3>
                </div>
                <EUDRSummaryCard />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
