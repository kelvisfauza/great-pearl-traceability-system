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
import DailyComparisonChart from '@/components/dashboard/DailyComparisonChart';
import RevenueExpenseChart from '@/components/dashboard/RevenueExpenseChart';
import DepartmentActivityChart from '@/components/dashboard/DepartmentActivityChart';
import EmployeeOfTheMonthWidget from '@/components/dashboard/EmployeeOfTheMonthWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee, Settings, Activity, Calendar, Package, Sparkles, Clock
} from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Coffee className="w-7 h-7 text-primary" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Loading workspace...</p>
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

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isAdmin = employee.role === 'Administrator' || employee.role === 'Super Admin';

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview" showMessageButton={false}>
      <div className="space-y-4 pb-8">
        <HolidayBanner userName={employee?.name?.split(' ')[0]} />
        <AssignedRoleNotification />

        {/* Welcome Bar - Compact */}
        <div className="relative overflow-hidden rounded-xl border border-primary/15">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-chart-4/80" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="relative px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-11 w-11 border-2 border-primary-foreground/20">
                  <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
                  <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground font-bold text-sm">
                    {employee?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground leading-tight">{getGreeting()}, {employee?.name?.split(' ')[0]}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-primary-foreground/50 flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{currentDate}</span>
                  <span className="text-primary-foreground/20">·</span>
                  <span className="text-[10px] text-primary-foreground/50 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{currentTime}</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              {employee?.employee_id && (
                <Badge className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/15 text-[9px] font-mono px-2 py-0.5">{employee.employee_id}</Badge>
              )}
              <Badge className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/15 text-[9px] px-2 py-0.5">{employee?.department}</Badge>
              <Badge className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/15 text-[9px] px-2 py-0.5">{employee?.role}</Badge>
            </div>
          </div>
        </div>

        {/* Employee of the Month - Pinned for all staff */}
        <EmployeeOfTheMonthWidget />

        {/* KPI Cards with Sparklines */}
        <DashboardStats />

        {/* Main Charts Grid - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DailyComparisonChart />
          </div>
          <PerformanceOverview />
        </div>

        {/* Financial + Department Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueExpenseChart />
          <DepartmentActivityChart />
        </div>

        {/* Work Summary */}
        <WorkSummaryPanel />

        {/* Operational Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BuyingRecommendationsCard />
          <StoreRealTimeTracker />
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-4">
            <UpcomingBookingsWidget />
            <Card className="border-border/30 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-primary via-chart-4 to-chart-2" />
              <CardHeader className="pb-3 border-b border-border/20 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold">Administration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <AdminDashboard />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <QuickActions />
          </div>
          <Card className="lg:col-span-2 border-border/30 hidden lg:flex lg:flex-col overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-chart-4 to-chart-2" />
            <CardHeader className="pb-2 border-b border-border/20 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-chart-4/10 rounded-lg">
                    <Activity className="h-4 w-4 text-chart-4" />
                  </div>
                  <CardTitle className="text-sm font-bold">Live Activity</CardTitle>
                </div>
                <Badge variant="outline" className="text-[9px] animate-pulse border-chart-4/30 text-chart-4">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 flex-1">
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* EUDR */}
        {(employee.department === 'Store' || isAdmin) && (
          <Card className="border-border/30 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-success to-chart-2" />
            <CardHeader className="pb-2 border-b border-border/20 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-success/10 rounded-lg">
                  <Package className="h-4 w-4 text-success" />
                </div>
                <CardTitle className="text-sm font-bold">EUDR Compliance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <EUDRSummaryCard />
            </CardContent>
          </Card>
        )}

        <NotificationPanel isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
        <BonusClaimPopup />
      </div>
    </DashboardLayout>
  );
};

export default Index;
