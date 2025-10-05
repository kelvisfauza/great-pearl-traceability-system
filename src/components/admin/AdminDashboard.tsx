import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertTriangle, DollarSign, Users, TrendingUp } from 'lucide-react';
import DeletionRequestsManager from './DeletionRequestsManager';
import MoneyRequestsFinalApproval from './MoneyRequestsFinalApproval';
import RoleAssignmentManager from './RoleAssignmentManager';
import PermissionOverview from './PermissionOverview';
import UserPermissionsList from './UserPermissionsList';
import QuickPermissionAssignment from './QuickPermissionAssignment';
import AdminExpenseRequestsManager from './AdminExpenseRequestsManager';
import ApprovedRequestsHistory from './ApprovedRequestsHistory';
import CashManagementModal from './CashManagementModal';
import SystemDataReset from './SystemDataReset';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Administrator Hub</h1>
            <p className="text-muted-foreground">System oversight, approvals, and critical administrative tasks</p>
          </div>
        </div>
        <Button onClick={() => setCashModalOpen(true)} className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Manage Finance Cash
        </Button>
      </div>

      <CashManagementModal open={cashModalOpen} onOpenChange={setCashModalOpen} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-lg font-semibold">Operational</span>
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-orange-600">
                        {requestsLoading ? '...' : requests.length}
                      </Badge>
                      <span className="text-lg font-semibold">Requires Action</span>
                    </div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-blue-600">
                        {presenceLoading ? '...' : onlineCount}
                      </Badge>
                      <span className="text-lg font-semibold">Online</span>
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Financial</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-green-600">UGX 2.5M</Badge>
                      <span className="text-sm font-semibold">Pending</span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('approvals')}>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">View Approvals</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('permissions')}>
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Manage Roles</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">View Reports</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* System Data Reset - Admin Only */}
          <SystemDataReset />

          {/* System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionOverview />
            <ActiveUsers />
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
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
          {/* Full width for Admin Expense Review */}
          <div className="grid grid-cols-1 gap-6">
            <AdminExpenseRequestsManager />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Money Requests - Final Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyRequestsFinalApproval />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Deletion Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <DeletionRequestsManager />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <ApprovedRequestsHistory />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminDashboard;
