import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import ApprovalCenter from '@/components/ApprovalCenter';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import DynamicHeader from '@/components/DynamicHeader';
import AssignedRoleNotification from '@/components/AssignedRoleNotification';
import NotificationWidget from '@/components/notifications/NotificationWidget';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';
import { Coffee, TrendingUp, Users, Shield, Bell, Activity, Settings, BarChart3 } from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
  const roleData = useRoleBasedData();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Debug logging for role changes
  console.log('=== INDEX PAGE RENDER ===');
  console.log('Employee:', employee?.name, 'Role:', employee?.role);
  console.log('RoleData isAdmin:', roleData?.isAdmin);
  console.log('Can approve requests:', roleData?.canApproveRequests);

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <div className="animate-scale-in">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <Layout title="Dashboard" subtitle="Welcome to your workspace" showMessageButton={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Dynamic Header */}
          <div className="animate-in">
            <DynamicHeader />
          </div>

          {/* Assigned Role Notification */}
          <div className="animate-in-delay">
            <AssignedRoleNotification />
          </div>

          {/* Admin Dashboard Section */}
          {employee.role === 'Administrator' && (
            <div className="space-y-4 animate-in-delay">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Administration Center</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">System oversight and user management</p>
                </div>
              </div>
              <div className="card-modern">
                <AdminDashboard />
              </div>
            </div>
          )}

          {/* Stats Section */}
          <div className="space-y-4 animate-in-delay">
            <DashboardStats />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Actions - 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Quick Operations</h3>
              </div>
              <div className="card-modern p-4 sm:p-6">
                <QuickActions />
              </div>
            </div>
            
            {/* Recent Activity - 1 column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Activity</h3>
              </div>
              <RecentActivity />
            </div>
          </div>

          {/* Approval Center - Full Width */}
          {roleData?.canApproveRequests && (
            <div className="space-y-4 animate-in-delay">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Approval Management</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Review and process pending requests</p>
                </div>
              </div>
              <div className="card-modern p-4 sm:p-6">
                <ApprovalCenter />
              </div>
            </div>
          )}

          {/* Bottom Grid - Performance, Notifications, EUDR */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Performance */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Performance</h3>
              </div>
              <div className="card-modern p-4 sm:p-6">
                <PerformanceOverview />
              </div>
            </div>
            
            {/* Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="card-modern p-4 sm:p-6">
                <NotificationWidget onViewAll={() => setIsNotificationOpen(true)} />
              </div>
            </div>

            {/* EUDR Compliance */}
            {(employee.department === 'Store' || employee.role === 'Administrator') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">EUDR Compliance</h3>
                </div>
                <div className="card-modern p-4 sm:p-6">
                  <EUDRSummaryCard />
                </div>
              </div>
            )}
          </div>
          
          {/* Notification Panel */}
          <NotificationPanel 
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Index;