import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import ApprovalCenter from '@/components/ApprovalCenter';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import AssignedRoleNotification from '@/components/AssignedRoleNotification';
import NotificationWidget from '@/components/notifications/NotificationWidget';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';
import { Coffee, TrendingUp, Shield, Bell, Activity, Settings, BarChart3 } from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
  const roleData = useRoleBasedData();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back" showMessageButton={false}>
      <div className="space-y-6 pb-6">
        {/* Role Notification */}
        <AssignedRoleNotification />

        {/* Welcome Section */}
        <div className="card-modern p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {employee?.name?.split(' ')[0]}
              </h2>
              <p className="text-muted-foreground text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Dashboard Section */}
        {(employee.role === 'Administrator' || employee.role === 'Super Admin') && (
          <section className="space-y-4">
            <div className="section-header">
              <div className="section-icon">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="section-title">Administration Center</h3>
                <p className="section-subtitle">System oversight and user management</p>
              </div>
            </div>
            <div className="card-modern overflow-hidden">
              <AdminDashboard />
            </div>
          </section>
        )}

        {/* Stats Section */}
        <section>
          <DashboardStats />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="section-header">
              <div className="section-icon">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="section-title">Quick Operations</h3>
            </div>
            <div className="card-modern p-5">
              <QuickActions />
            </div>
          </div>
          
          {/* Recent Activity - 1 column */}
          <div className="hidden lg:block space-y-4">
            <div className="section-header">
              <div className="section-icon">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h3 className="section-title">Recent Activity</h3>
            </div>
            <RecentActivity />
          </div>
        </div>

        {/* Approval Center */}
        {roleData?.canApproveRequests && (
          <section className="space-y-4">
            <div className="section-header">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="section-title">Approval Management</h3>
                <p className="section-subtitle">Review and process pending requests</p>
              </div>
            </div>
            <div className="card-modern p-5">
              <ApprovalCenter />
            </div>
          </section>
        )}

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Performance */}
          <div className="space-y-4">
            <div className="section-header">
              <div className="section-icon">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="section-title">Performance</h3>
            </div>
            <div className="card-modern p-5">
              <PerformanceOverview />
            </div>
          </div>
          
          {/* Notifications */}
          <div className="space-y-4">
            <div className="section-header">
              <div className="section-icon">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h3 className="section-title">Notifications</h3>
            </div>
            <div className="card-modern p-5">
              <NotificationWidget onViewAll={() => setIsNotificationOpen(true)} />
            </div>
          </div>

          {/* EUDR Compliance */}
          {(employee.department === 'Store' || employee.role === 'Administrator') && (
            <div className="space-y-4">
              <div className="section-header">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Coffee className="h-5 w-5 text-success" />
                </div>
                <h3 className="section-title">EUDR Compliance</h3>
              </div>
              <div className="card-modern p-5">
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
    </DashboardLayout>
  );
};

export default Index;
