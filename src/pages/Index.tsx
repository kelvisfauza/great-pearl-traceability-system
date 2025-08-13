
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import ApprovalRequests from '@/components/ApprovalRequests';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import DynamicHeader from '@/components/DynamicHeader';
import AssignedRoleNotification from '@/components/AssignedRoleNotification';
import NotificationWidget from '@/components/notifications/NotificationWidget';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';

const Index = () => {
  const { employee } = useAuth();
  const roleData = useRoleBasedData();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/10 space-y-10 p-6">
        {/* Dynamic Header */}
        <DynamicHeader />

        {/* Assigned Role Notification */}
        <AssignedRoleNotification />

        {/* Admin Dashboard Section */}
        {employee.role === 'Administrator' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 shadow-lg">
                <div className="h-6 w-6 bg-white rounded-md"></div>
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Admin Controls
                </h2>
                <p className="text-muted-foreground">Manage system settings and user permissions</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-xl">
              <AdminDashboard />
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="space-y-12">
          {/* Stats Section */}
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg">
                <div className="h-6 w-6 bg-white rounded-md"></div>
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Key Metrics
                </h2>
                <p className="text-muted-foreground">Real-time performance indicators</p>
              </div>
            </div>
            <DashboardStats />
          </div>

          {/* Quick Actions & Activities */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 animate-fade-in">
            <div className="xl:col-span-3 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
                  <div className="h-5 w-5 bg-white rounded-md"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Quick Actions
                  </h3>
                  <p className="text-muted-foreground text-sm">Shortcuts to common tasks</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                <QuickActions />
              </div>
            </div>
            
            <div className="xl:col-span-2 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
                  <div className="h-5 w-5 bg-white rounded-md"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Recent Activity
                  </h3>
                  <p className="text-muted-foreground text-sm">Latest system updates</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                <RecentActivity />
              </div>
            </div>
          </div>

          {/* Performance & Approvals */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 animate-fade-in">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg">
                  <div className="h-5 w-5 bg-white rounded-md"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Performance
                  </h3>
                  <p className="text-muted-foreground text-sm">System analytics</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                <PerformanceOverview />
              </div>
            </div>
            
            {/* Approval Requests Section - Admin and Assigned Users */}
            {roleData?.canApproveRequests && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 shadow-lg">
                    <div className="h-5 w-5 bg-white rounded-md"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                      Approvals
                    </h3>
                    <p className="text-muted-foreground text-sm">Pending requests</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                  <ApprovalRequests />
                </div>
              </div>
            )}

            
            {/* Notifications Section */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg">
                  <div className="h-5 w-5 bg-white rounded-md"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Notifications
                  </h3>
                  <p className="text-muted-foreground text-sm">Recent alerts & updates</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                <NotificationWidget onViewAll={() => setIsNotificationOpen(true)} />
              </div>
            </div>

            {/* EUDR Compliance Section */}
            {(employee.department === 'Store' || employee.role === 'Administrator') && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                    <div className="h-5 w-5 bg-white rounded-md"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      EUDR Compliance
                    </h3>
                    <p className="text-muted-foreground text-sm">Documentation status</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-3xl p-8 border border-border/50 shadow-lg">
                  <EUDRSummaryCard />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Notification Panel */}
        <NotificationPanel 
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default Index;
