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
import { Separator } from '@/components/ui/separator';
import { 
  Coffee, 
  Settings, 
  Activity,
  Calendar,
  Package,
  Zap,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';

const Index = () => {
  const { employee } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="relative">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Coffee className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading your workspace...</p>
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

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAdmin = employee.role === 'Administrator' || employee.role === 'Super Admin';

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview of your workspace" showMessageButton={false}>
      <div className="space-y-6 pb-10">
        {/* Holiday Banner */}
        <HolidayBanner userName={employee?.name?.split(' ')[0]} />
        <AssignedRoleNotification />

        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-chart-4" />
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px), radial-gradient(circle at 80% 20%, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-4/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />
          
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20 border-[3px] border-primary-foreground/30 shadow-2xl">
                    <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-black text-xl md:text-2xl backdrop-blur-sm">
                      {employee?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-primary ring-2 ring-success/30" />
                </div>
                <div>
                  <p className="text-primary-foreground/70 text-sm font-medium mb-0.5">{getGreeting()}</p>
                  <h1 className="text-2xl md:text-3xl font-black text-primary-foreground tracking-tight">
                    {employee?.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-primary-foreground/60">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{currentDate}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-primary-foreground/30" />
                    <div className="flex items-center gap-1.5 text-primary-foreground/60">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{currentTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {employee?.employee_id && (
                    <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 backdrop-blur-sm text-xs font-mono px-3 py-1">
                      {employee.employee_id}
                    </Badge>
                  )}
                  <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 backdrop-blur-sm text-xs px-3 py-1">
                    {employee?.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/15 text-xs">
                    {employee?.department}
                  </Badge>
                  <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/15 text-xs">
                    {employee?.position}
                  </Badge>
                </div>
              </div>
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
          <div className="space-y-6">
            <UpcomingBookingsWidget />
            <Card className="border-border/50 shadow-lg shadow-primary/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-chart-4 to-chart-2" />
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-primary/15 to-chart-4/10 rounded-xl">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Administration Panel</CardTitle>
                    <p className="text-xs text-muted-foreground">System oversight & management controls</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <AdminDashboard />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-3">
            <QuickActions />
          </div>

          {/* Activity */}
          <Card className="lg:col-span-2 border-border/50 shadow-lg shadow-primary/5 hidden lg:flex lg:flex-col overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-chart-4 to-chart-2" />
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-chart-4/15 to-chart-2/10 rounded-xl">
                    <Activity className="h-5 w-5 text-chart-4" />
                  </div>
                  <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs animate-pulse border-chart-4/30 text-chart-4">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* Performance & Compliance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PerformanceOverview />

          {(employee.department === 'Store' || isAdmin) && (
            <Card className="border-border/50 shadow-lg shadow-success/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-success to-chart-2" />
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-success/15 to-chart-2/10 rounded-xl">
                    <Package className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">EUDR Compliance</CardTitle>
                    <p className="text-xs text-muted-foreground">Deforestation regulation tracking</p>
                  </div>
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
