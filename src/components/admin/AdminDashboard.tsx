import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertTriangle, DollarSign, Users, TrendingUp, BarChart3, Settings, Calendar, Archive, Gift, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RoleAssignmentManager from './RoleAssignmentManager';
import PermissionOverview from './PermissionOverview';
import UserPermissionsList from './UserPermissionsList';
import QuickPermissionAssignment from './QuickPermissionAssignment';
import AdminExpenseRequestsManager from './AdminExpenseRequestsManager';
import AdminMoneyRequestsManager from './AdminMoneyRequestsManager';
import ApprovedRequestsHistory from './ApprovedRequestsHistory';
import CashManagementModal from './CashManagementModal';
import TopSuppliersChart from './TopSuppliersChart';
import InventoryOverviewChart from './InventoryOverviewChart';
import BuyingRecommendationsCard from './BuyingRecommendationsCard';
import { AttendanceManager } from './AttendanceManager';
import { DataArchiveManager } from './DataArchiveManager';
import ChristmasVoucherManager from './ChristmasVoucherManager';
import { useUnifiedApprovalRequests } from '@/hooks/useUnifiedApprovalRequests';
import { usePresenceList } from '@/hooks/usePresenceList';
import ActiveUsers from '@/components/it/ActiveUsers';
import { supabase } from '@/integrations/supabase/client';


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [moneyRequestsCount, setMoneyRequestsCount] = useState(0);
  
  const { requests, loading: requestsLoading } = useUnifiedApprovalRequests();
  const { onlineCount, loading: presenceLoading } = usePresenceList();
  const { toast } = useToast();

  console.log('🚀 AdminDashboard - activeTab:', activeTab);
  console.log('🚀 AdminDashboard component loaded');

  // Fetch money requests count for badge
  useEffect(() => {
    const fetchMoneyRequestsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('money_requests')
          .select('*', { count: 'exact', head: true })
          .eq('approval_stage', 'pending_admin');
        
        if (error) throw error;
        setMoneyRequestsCount(count || 0);
      } catch (error) {
        console.error('Error fetching money requests count:', error);
      }
    };

    fetchMoneyRequestsCount();

    // Subscribe to changes
    const channel = supabase
      .channel('admin_money_requests_count')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'money_requests' },
        () => fetchMoneyRequestsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Shield className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Administrator Hub
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground">System oversight, analytics, and critical operations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setCashModalOpen(true)} 
            size="default"
            className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
          >
            <DollarSign className="h-4 w-4" />
            Finance Cash
          </Button>
        </div>
      </div>

      <CashManagementModal open={cashModalOpen} onOpenChange={setCashModalOpen} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:grid-cols-6 bg-muted/50 p-1 rounded-xl gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Approvals
              {(requests.length > 0 || moneyRequestsCount > 0) && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                  {requests.length + moneyRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm">
              <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Archive
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">System Status</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xl font-bold">Operational</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-7 w-7 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Pending Approvals</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold">
                        {requestsLoading ? '...' : requests.length}
                      </span>
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Action Required
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950">
                    <AlertTriangle className="h-7 w-7 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Active Users</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold">
                        {presenceLoading ? '...' : onlineCount}
                      </span>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Online Now
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950">
                    <Users className="h-7 w-7 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Finance Status</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">Active</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950">
                    <DollarSign className="h-7 w-7 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card 
                  className="cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all group border-2" 
                  onClick={() => setActiveTab('approvals')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm font-medium">View Approvals</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all group border-2" 
                  onClick={() => setActiveTab('permissions')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950 mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium">Manage Roles</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all group border-2" 
                  onClick={() => setActiveTab('analytics')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium">View Analytics</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all group border-2"
                  onClick={() => setCashModalOpen(true)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium">Finance Cash</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Buying Recommendations */}
          <BuyingRecommendationsCard />

          {/* System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionOverview />
            <ActiveUsers />
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <AttendanceManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopSuppliersChart />
            <InventoryOverviewChart />
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Permission Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control user access and role assignments
              </p>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UserPermissionsList />
            </div>
            <div className="space-y-6">
              <QuickPermissionAssignment />
              <RoleAssignmentManager />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Approval Management Center
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and process all pending administrative approvals
              </p>
            </CardHeader>
          </Card>

          {/* Expense Requests */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Expense Requests</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminExpenseRequestsManager />
            </CardContent>
          </Card>

          {/* Money Requests (Salary/Lunch) - Admin Approval First */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Money Requests (Pending Admin Approval)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminMoneyRequestsManager />
            </CardContent>
          </Card>
          {/* Christmas Vouchers */}
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-50 to-green-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-red-600" />
                🎄 Christmas Vouchers - Pending Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ChristmasVoucherManager />
            </CardContent>
          </Card>

          {/* Approved History */}
          <ApprovedRequestsHistory />
        </TabsContent>

        <TabsContent value="archive" className="space-y-6">
          <DataArchiveManager />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminDashboard;
