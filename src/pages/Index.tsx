import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/DashboardStats';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import PerformanceOverview from '@/components/PerformanceOverview';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import AssignedRoleNotification from '@/components/AssignedRoleNotification';
import NotificationWidget from '@/components/notifications/NotificationWidget';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import BuyingRecommendationsCard from '@/components/admin/BuyingRecommendationsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Coffee, 
  TrendingUp, 
  Bell, 
  Activity, 
  Settings, 
  BarChart3,
  Calendar,
  Users,
  Package,
  ArrowUpRight
} from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview of your workspace" showMessageButton={false}>
      <div className="space-y-6 pb-6">
        {/* Role Notification */}
        <AssignedRoleNotification />

        {/* Buying Prices - Top of Dashboard for All Users */}
        <BuyingRecommendationsCard />

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}, {employee?.name?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {currentDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">{employee?.position}</p>
              <p className="text-xs text-muted-foreground">{employee?.department}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <DashboardStats />

        {/* Admin Dashboard Section */}
        {(employee.role === 'Administrator' || employee.role === 'Super Admin') && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Administration Center</CardTitle>
                  <p className="text-sm text-muted-foreground">System oversight and management</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AdminDashboard />
            </CardContent>
          </Card>
        )}

        {/* Main Grid - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Actions Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="hidden lg:flex lg:flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* Secondary Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Performance Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-1/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-chart-1" />
                </div>
                <CardTitle className="text-lg">Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <PerformanceOverview />
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
                <CardTitle className="text-lg">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <NotificationWidget onViewAll={() => setIsNotificationOpen(true)} />
            </CardContent>
          </Card>

          {/* EUDR Compliance Card */}
          {(employee.department === 'Store' || employee.role === 'Administrator') && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Package className="h-5 w-5 text-success" />
                  </div>
                  <CardTitle className="text-lg">EUDR Compliance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <EUDRSummaryCard />
              </CardContent>
            </Card>
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
