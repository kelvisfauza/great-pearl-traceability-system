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

  const SectionHeader = ({ icon: Icon, title, subtitle, gradient }: { 
    icon: any, 
    title: string, 
    subtitle: string, 
    gradient: string 
  }) => (
    <div className="flex items-center gap-4 mb-6 md:mb-8 animate-slide-up">
      <div className={`p-3 rounded-2xl bg-gradient-to-r ${gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient.replace('to-', 'to-').replace('from-', 'from-')} bg-clip-text text-transparent`}>
          {title}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <Layout title="Dashboard" subtitle="Welcome to your workspace" showMessageButton={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Sophisticated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-100/30 to-indigo-100/30 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-slate-100/40 to-gray-100/40 dark:from-slate-800/30 dark:to-gray-800/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-50/20 to-indigo-50/20 dark:from-blue-950/15 dark:to-indigo-950/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 space-y-8 md:space-y-12 p-4 md:p-8">
          {/* Dynamic Header */}
          <div className="animate-fade-in">
            <DynamicHeader />
          </div>

          {/* Assigned Role Notification */}
          <div className="animate-fade-in delay-100">
            <AssignedRoleNotification />
          </div>

          {/* Admin Dashboard Section */}
          {employee.role === 'Administrator' && (
            <div className="space-y-8 animate-fade-in delay-200">
              <SectionHeader 
                icon={Settings}
                title="Administration Center"
                subtitle="System oversight and user management"
                gradient="from-slate-600 to-slate-700"
              />
              <div className="bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/70 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-800/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-600/40 rounded-3xl p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] hover:border-blue-300/40 dark:hover:border-blue-700/40">
                <AdminDashboard />
              </div>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="space-y-8 md:space-y-12">
            {/* Stats Section */}
            <div className="space-y-8 animate-fade-in delay-300">
              <SectionHeader 
                icon={BarChart3}
                title="Performance Analytics"
                subtitle="Key metrics and operational insights"
                gradient="from-blue-600 to-blue-700"
              />
              <DashboardStats />
            </div>

            {/* Quick Actions & Activities */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 md:gap-8 animate-fade-in delay-400">
              <div className="xl:col-span-3 space-y-6 md:space-y-8">
                <SectionHeader 
                  icon={TrendingUp}
                  title="Quick Operations"
                  subtitle="Streamlined workflow tools"
                  gradient="from-emerald-600 to-teal-700"
                />
                <div className="bg-gradient-to-br from-white/95 via-emerald-50/60 to-teal-50/50 dark:from-slate-800/95 dark:via-emerald-950/40 dark:to-teal-950/30 rounded-3xl p-6 md:p-8 border border-emerald-200/50 dark:border-emerald-800/40 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] backdrop-blur-xl hover:border-emerald-300/60 dark:hover:border-emerald-700/50">
                  <QuickActions />
                </div>
              </div>
              
              <div className="xl:col-span-2 space-y-6 md:space-y-8">
                <SectionHeader 
                  icon={Activity}
                  title="System Activity"
                  subtitle="Recent operations and updates"
                  gradient="from-indigo-600 to-purple-700"
                />
                <div className="animate-slide-up delay-500">
                  <RecentActivity />
                </div>
              </div>
            </div>

            {/* Approval Requests Section - Make it prominent for authorized users */}
            {roleData?.canApproveRequests && (
              <div className="space-y-8 animate-fade-in delay-500">
                <SectionHeader 
                  icon={Shield}
                  title="Approval Management Center"
                  subtitle="Review and process pending requests from all departments"
                  gradient="from-red-500 to-rose-600"
                />
                <div className="bg-gradient-to-br from-white/95 via-red-50/60 to-rose-50/50 dark:from-slate-800/95 dark:via-red-950/40 dark:to-rose-950/30 backdrop-blur-xl border border-red-200/60 dark:border-red-800/40 rounded-3xl p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.005] hover:border-red-300/60 dark:hover:border-red-700/50">
                  <ApprovalCenter />
                </div>
              </div>
            )}

            {/* Performance & Additional Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 animate-fade-in delay-600">
              {/* Performance Section */}
              <div className="space-y-6 md:space-y-8">
                <SectionHeader 
                  icon={BarChart3}
                  title="Performance"
                  subtitle="System analytics"
                  gradient="from-amber-500 to-orange-600"
                />
                <div className="bg-gradient-to-br from-card via-card/98 to-muted/5 rounded-3xl p-6 md:p-8 border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] backdrop-blur-sm">
                  <PerformanceOverview />
                </div>
              </div>
              
              {/* Notifications Section */}
              <div className="space-y-6 md:space-y-8">
                <SectionHeader 
                  icon={Bell}
                  title="Notifications"
                  subtitle="Recent alerts & updates"
                  gradient="from-violet-500 to-purple-600"
                />
                <div className="bg-gradient-to-br from-card via-card/98 to-muted/5 rounded-3xl p-6 md:p-8 border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] backdrop-blur-sm">
                  <NotificationWidget onViewAll={() => setIsNotificationOpen(true)} />
                </div>
              </div>

              {/* EUDR Compliance Section */}
              {(employee.department === 'Store' || employee.role === 'Administrator') && (
                <div className="space-y-6 md:space-y-8">
                  <SectionHeader 
                    icon={Coffee}
                    title="EUDR Compliance"
                    subtitle="Documentation status"
                    gradient="from-green-500 to-emerald-600"
                  />
                  <div className="bg-gradient-to-br from-card via-card/98 to-muted/5 rounded-3xl p-6 md:p-8 border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] backdrop-blur-sm">
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
      </div>
    </Layout>
  );
};

export default Index;