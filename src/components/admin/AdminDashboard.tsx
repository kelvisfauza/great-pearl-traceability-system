import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertTriangle, DollarSign, Users, TrendingUp, BarChart3, Settings } from 'lucide-react';
import DeletionRequestsManager from './DeletionRequestsManager';
import MoneyRequestsFinalApproval from './MoneyRequestsFinalApproval';
import RoleAssignmentManager from './RoleAssignmentManager';
import PermissionOverview from './PermissionOverview';
import UserPermissionsList from './UserPermissionsList';
import QuickPermissionAssignment from './QuickPermissionAssignment';
import AdminExpenseRequestsManager from './AdminExpenseRequestsManager';
import ApprovedRequestsHistory from './ApprovedRequestsHistory';
import CashManagementModal from './CashManagementModal';
import TopSuppliersChart from './TopSuppliersChart';
import InventoryOverviewChart from './InventoryOverviewChart';
import { useUnifiedApprovalRequests } from '@/hooks/useUnifiedApprovalRequests';
import { usePresenceList } from '@/hooks/usePresenceList';
import ActiveUsers from '@/components/it/ActiveUsers';


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const { requests, loading: requestsLoading } = useUnifiedApprovalRequests();
  const { onlineCount, loading: presenceLoading } = usePresenceList();

  console.log('🚀 AdminDashboard - activeTab:', activeTab);
  console.log('🚀 AdminDashboard component loaded');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Administrator Hub
            </h1>
            <p className="text-muted-foreground">System oversight, analytics, and critical operations</p>
          </div>
        </div>
        <Button 
          onClick={() => setCashModalOpen(true)} 
          size="lg"
          className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <DollarSign className="h-4 w-4" />
          Finance Cash
        </Button>
      </div>

      <CashManagementModal open={cashModalOpen} onOpenChange={setCashModalOpen} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:w-auto bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
            <Shield className="h-4 w-4" />
            Approvals
            {requests.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
            <Settings className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

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

          {/* System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionOverview />
            <ActiveUsers />
          </div>
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

          {/* Money Requests */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Money Requests - Final Approval</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <MoneyRequestsFinalApproval />
            </CardContent>
          </Card>

          {/* Deletion Requests */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Deletion Requests</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DeletionRequestsManager />
            </CardContent>
          </Card>

          {/* Approved History */}
          <ApprovedRequestsHistory />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminDashboard;
