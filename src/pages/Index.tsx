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
import BonusClaimPopup from '@/components/BonusClaimPopup';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import BuyingRecommendationsCard from '@/components/admin/BuyingRecommendationsCard';
import UpcomingBookingsWidget from '@/components/admin/UpcomingBookingsWidget';
import StoreRealTimeTracker from '@/components/v2/admin/StoreRealTimeTracker';
import HolidayBanner from '@/components/HolidayBanner';
import WorkSummaryPanel from '@/components/dashboard/WorkSummaryPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee, 
  Settings, 
  Activity,
  Calendar,
  Package,
  Zap,
  LayoutGrid
} from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
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

  const isAdmin = employee.role === 'Administrator' || employee.role === 'Super Admin';

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview of your workspace" showMessageButton={false}>
      <div className="space-y-5 pb-8">
        {/* Holiday Banner */}
        <HolidayBanner userName={employee?.name?.split(' ')[0]} />
        <AssignedRoleNotification />

        {/* Welcome Header - Executive style */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-border/60 p-5 md:p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-background shadow-md ring-2 ring-primary/10">
                <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {employee?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {getGreeting()}, {employee?.name?.split(' ')[0]}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{currentDate}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {employee?.employee_id && (
                <Badge variant="outline" className="text-xs font-mono bg-background/80 backdrop-blur-sm">
                  {employee.employee_id}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                {employee?.department}
              </Badge>
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                {employee?.position}
              </Badge>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <DashboardStats />

        {/* Work Summary */}
        <WorkSummaryPanel />

        {/* Buying Prices */}
        <BuyingRecommendationsCard />

        {/* Store Real-Time Tracking */}
        <StoreRealTimeTracker />

        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-5">
            <UpcomingBookingsWidget />
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/8 rounded-xl">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Administration</CardTitle>
                    <p className="text-xs text-muted-foreground">System oversight & management</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <AdminDashboard />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Quick Actions - wider */}
          <Card className="lg:col-span-3 border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/10 rounded-xl">
                  <Zap className="h-4 w-4 text-chart-3" />
                </div>
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <QuickActions />
            </CardContent>
          </Card>

          {/* Activity - narrower */}
          <Card className="lg:col-span-2 border-border/60 shadow-sm hidden lg:flex lg:flex-col">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-xl">
                  <Activity className="h-4 w-4 text-chart-4" />
                </div>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* Performance & Compliance row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PerformanceOverview />

          {(employee.department === 'Store' || isAdmin) && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-xl">
                    <Package className="h-4 w-4 text-success" />
                  </div>
                  <CardTitle className="text-base font-semibold">EUDR Compliance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
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
        <BonusClaimPopup />
      </div>
    </DashboardLayout>
  );
};

export default Index;
